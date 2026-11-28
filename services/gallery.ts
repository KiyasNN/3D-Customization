import { create } from 'zustand';
import { DEMO_ASSET, useStore } from '../store';
import { INITIAL_MATERIALS } from '../constants';
import type { UploadedAsset } from '../types';
import {
  captureDesignState, collectBlobUrls, GalleryMeta, GalleryPayload, GallerySnapshot,
  nextSlideIndex, replaceStrings, restoreVisibility,
} from './gallerySnapshot';
import { deleteGalleryRecord, getGalleryPayload, listGalleryMeta, putGalleryItem, putGalleryMeta } from './galleryDb';

const INTERVAL_KEY = 'nk_gallery_interval';
export const GALLERY_INTERVALS = [5, 8, 12, 20, 30];

function readInterval() {
  try {
    const value = Number(localStorage.getItem(INTERVAL_KEY));
    return GALLERY_INTERVALS.includes(value) ? value : 8;
  } catch { return 8; }
}

interface GalleryState {
  items: GalleryMeta[];
  loaded: boolean;
  busy: boolean;
  error: string | null;
  playing: boolean;
  paused: boolean;
  playIndex: number;
  intervalSec: number;
  activeId: string | null;
}

export const useGalleryStore = create<GalleryState>(() => ({
  items: [],
  loaded: false,
  busy: false,
  error: null,
  playing: false,
  paused: false,
  playIndex: 0,
  intervalSec: readInterval(),
  activeId: null,
}));

// The 3D canvas registers how to read the camera and grab a frame (see GalleryViewBridge in App.tsx).
type ViewAccess = {
  getCamera: () => GallerySnapshot['camera'];
  captureFrame: () => string | null;
};
let viewAccess: ViewAccess | null = null;
export function registerGalleryView(access: ViewAccess | null) { viewAccess = access; }

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const errorMessage = (err: unknown) => err instanceof Error ? err.message : String(err);
const isQuotaError = (err: unknown) => err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22);

export async function refreshGallery() {
  try {
    const items = await listGalleryMeta();
    useGalleryStore.setState({ items, loaded: true, error: null });
  } catch (err) {
    useGalleryStore.setState({ loaded: true, error: errorMessage(err) });
  }
}

async function toBlob(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not read ${url}`);
  return response.blob();
}

async function captureThumbnail() {
  await new Promise(requestAnimationFrame);
  return viewAccess?.captureFrame() || '';
}

export async function saveCurrentToGallery(name?: string) {
  const state = useStore.getState();
  const model = state.currentModel || DEMO_ASSET;
  useGalleryStore.setState({ busy: true, error: null });
  try {
    const isDemo = model.id === DEMO_ASSET.id;
    const file = isDemo ? null : await toBlob(model.url);
    const resources: Record<string, Blob> = {};
    for (const [fileName, url] of Object.entries(model.resources || {})) {
      resources[fileName] = await toBlob(url);
    }

    const snapshot = captureDesignState(state, new Set(INITIAL_MATERIALS.map(m => m.id)), {
      calibration: state.modelCalibrations[model.id],
      camera: viewAccess?.getCamera(),
    });
    const blobs: Record<string, Blob> = {};
    for (const url of collectBlobUrls(snapshot)) {
      try { blobs[url] = await toBlob(url); } catch { /* A revoked URL just loses that texture. */ }
    }

    const thumbnail = await captureThumbnail();
    const id = `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const items = useGalleryStore.getState().items;
    const meta: GalleryMeta = {
      id,
      name: name?.trim() || `${model.name.replace(/\.[^.]+$/, '')} ${items.length + 1}`,
      createdAt: Date.now(),
      thumbnail,
      modelName: model.name,
    };
    const payload: GalleryPayload = {
      id,
      model: { name: model.name, extension: model.extension, file, resources },
      snapshot,
      blobs,
    };
    await putGalleryItem(meta, payload);
    try { await navigator.storage?.persist?.(); } catch { /* Best effort: ask the browser not to evict. */ }
    useGalleryStore.setState({ items: [...items, meta], activeId: id });
    return meta;
  } catch (err) {
    const message = isQuotaError(err)
      ? 'Browser storage is full. Delete some gallery items and try again.'
      : errorMessage(err);
    useGalleryStore.setState({ error: message });
    throw new Error(message);
  } finally {
    useGalleryStore.setState({ busy: false });
  }
}

export async function renameGalleryItem(id: string, name: string) {
  const items = useGalleryStore.getState().items;
  const item = items.find(i => i.id === id);
  const trimmed = name.trim();
  if (!item || !trimmed || trimmed === item.name) return;
  const updated = { ...item, name: trimmed };
  await putGalleryMeta(updated);
  useGalleryStore.setState({ items: items.map(i => i.id === id ? updated : i) });
}

export async function deleteGalleryItem(id: string) {
  await deleteGalleryRecord(id);
  const { items, activeId } = useGalleryStore.getState();
  useGalleryStore.setState({ items: items.filter(i => i.id !== id), activeId: activeId === id ? null : activeId });
}

function waitForModel(isDemo: boolean, timeoutMs = 20000) {
  return new Promise<void>(resolve => {
    const ready = () => {
      const s = useStore.getState();
      return s.customParts.length > 0 && !s.isModelLoading;
    };
    if (ready()) { resolve(); return; }
    // The demo shoe can keep its part list across loads, so it isn't always re-announced.
    const timer = setTimeout(done, isDemo ? 1500 : timeoutMs);
    const unsubscribe = useStore.subscribe(() => { if (ready()) done(); });
    function done() { clearTimeout(timer); unsubscribe(); resolve(); }
  });
}

let openCounter = 0;
const liveUrls = new Set<string>();

// Puts a saved design back in the scene. `present` stages the reveal for the slideshow:
// assembled first, then explode, then labels.
export async function openGalleryItem(id: string, { present = false } = {}) {
  const payload = await getGalleryPayload(id);
  if (!payload) throw new Error('This gallery item no longer exists.');
  const openId = ++openCounter;
  const urls = new Set<string>();
  const makeUrl = (blob: Blob) => { const url = URL.createObjectURL(blob); urls.add(url); liveUrls.add(url); return url; };

  const replacements = Object.fromEntries(Object.entries(payload.blobs || {}).map(([old, blob]) => [old, makeUrl(blob)]));
  const snapshot = replaceStrings(payload.snapshot, replacements);
  const isDemo = !payload.model.file;
  const asset: UploadedAsset = isDemo ? DEMO_ASSET : {
    id: `${id}-${openId}`,
    name: payload.model.name,
    extension: payload.model.extension,
    url: makeUrl(payload.model.file!),
    resources: Object.fromEntries(Object.entries(payload.model.resources || {}).map(([name, blob]) => [name, makeUrl(blob)])),
  };

  const state = useStore.getState();
  const knownMaterials = new Set(state.materials.map(m => m.id));
  const modelChanged = state.currentModel?.id !== asset.id;
  useStore.setState({
    currentModel: asset,
    ...(modelChanged ? { customParts: [] } : {}),
    selectedPart: null,
    selectedParts: [],
    hoveredPart: null,
    isSingleMode: false,
    materials: [...state.materials, ...snapshot.materials.filter(m => !knownMaterials.has(m.id))],
    partMaterials: { ...snapshot.partMaterials },
    partConfigs: snapshot.partConfigs,
    partTextureScales: { ...snapshot.partTextureScales },
    partAnnotations: snapshot.partAnnotations,
    groupMoveEnabled: { ...snapshot.groupMoveEnabled },
    labelSize: snapshot.labelSize,
    isExploded: present ? false : snapshot.isExploded,
    showAnnotations: present ? false : snapshot.showAnnotations,
    ...(snapshot.calibration ? { modelCalibrations: { ...state.modelCalibrations, [asset.id]: snapshot.calibration } } : {}),
  });
  useGalleryStore.setState({ activeId: id });

  await waitForModel(isDemo);
  if (openId !== openCounter) return; // A newer item was opened meanwhile; it cleans up.
  liveUrls.forEach(url => {
    if (!urls.has(url)) { URL.revokeObjectURL(url); liveUrls.delete(url); }
  });

  const loaded = useStore.getState();
  useStore.setState({
    partVisibility: restoreVisibility(loaded.customParts, loaded.partVisibility, snapshot.partVisibility),
    history: [{
      partMaterials: { ...loaded.partMaterials },
      partVisibility: restoreVisibility(loaded.customParts, loaded.partVisibility, snapshot.partVisibility),
      partConfigs: JSON.parse(JSON.stringify(loaded.partConfigs)),
      partTextureScales: { ...loaded.partTextureScales },
      isSingleMode: false,
      selectedPart: null,
      selectedParts: [],
    }],
    historyIndex: 0,
  });

  // Let the model settle before moving the camera, so nothing overrides the saved view.
  await wait(250);
  if (openId !== openCounter) return;
  if (snapshot.camera) useStore.setState({ cameraRequest: { position: snapshot.camera.position, target: snapshot.camera.target } });
  else loaded.triggerFitView(true);

  if (present) {
    await wait(700);
    if (openId !== openCounter) return;
    useStore.setState({ isExploded: snapshot.isExploded });
    await wait(snapshot.isExploded ? 900 : 200);
    if (openId !== openCounter) return;
    useStore.setState({ showAnnotations: snapshot.showAnnotations });
  }
}

export function setGalleryInterval(seconds: number) {
  try { localStorage.setItem(INTERVAL_KEY, String(seconds)); } catch { /* Keep working without persistence. */ }
  useGalleryStore.setState({ intervalSec: seconds });
}

export function startSlideshow(startIndex = 0) {
  const { items } = useGalleryStore.getState();
  if (!items.length) return;
  useStore.setState({ isTurntableActive: false, isWalking: false });
  useGalleryStore.setState({ playing: true, paused: false, playIndex: Math.min(startIndex, items.length - 1) });
  try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch { /* Fullscreen is optional. */ }
}

export function stopSlideshow() {
  useGalleryStore.setState({ playing: false, paused: false });
  try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch { /* ignore */ }
}

export function stepSlideshow(step: 1 | -1) {
  const { playIndex, items } = useGalleryStore.getState();
  useGalleryStore.setState({ playIndex: nextSlideIndex(playIndex, items.length, step) });
}

export function togglePause() {
  useGalleryStore.setState(s => ({ paused: !s.paused }));
}
