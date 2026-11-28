import type { Annotation, Material, TextureConfig } from '../types';

export type Vec3 = [number, number, number];

export interface ModelCalibration {
  scale: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  positionX: number;
  positionY: number;
  positionZ: number;
}

// Everything needed to put a saved design back on screen, apart from the model file itself.
export interface GallerySnapshot {
  partMaterials: Record<string, string>;
  partConfigs: Record<string, TextureConfig>;
  partTextureScales: Record<string, number>;
  partAnnotations: Record<string, Annotation>;
  partVisibility: Record<string, boolean>;
  groupMoveEnabled: Record<string, boolean>;
  materials: Material[]; // Custom materials the design uses; built-in ones are already in the app.
  isExploded: boolean;
  showAnnotations: boolean;
  labelSize: number;
  calibration?: ModelCalibration;
  camera?: { position: Vec3; target: Vec3 };
}

export interface GalleryMeta {
  id: string;
  name: string;
  createdAt: number;
  thumbnail: string;
  modelName: string;
}

export interface GalleryPayload {
  id: string;
  model: {
    name: string;
    extension: string;
    file: Blob | null; // null for the built-in demo shoe
    resources: Record<string, Blob>; // Companion files (.bin, textures) by file name
  };
  snapshot: GallerySnapshot;
  blobs: Record<string, Blob>; // Session blob: URLs referenced by the snapshot, keyed by the original URL
}

export interface DesignStateSource {
  partMaterials: Record<string, string>;
  partConfigs: Record<string, TextureConfig>;
  partTextureScales: Record<string, number>;
  partAnnotations: Record<string, Annotation>;
  partVisibility: Record<string, boolean>;
  groupMoveEnabled: Record<string, boolean>;
  materials: Material[];
  isExploded: boolean;
  showAnnotations: boolean;
  labelSize: number;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? null));

export function captureDesignState(
  state: DesignStateSource,
  builtInMaterialIds: Set<string>,
  extras: { calibration?: ModelCalibration; camera?: GallerySnapshot['camera'] } = {},
): GallerySnapshot {
  const usedIds = new Set(Object.values(state.partMaterials || {}));
  const materials = (state.materials || []).filter(m =>
    usedIds.has(m.id) && !builtInMaterialIds.has(m.id) && m.type !== 'video');
  return {
    partMaterials: { ...state.partMaterials },
    partConfigs: clone(state.partConfigs || {}),
    partTextureScales: { ...state.partTextureScales },
    partAnnotations: clone(state.partAnnotations || {}),
    partVisibility: { ...state.partVisibility },
    groupMoveEnabled: { ...state.groupMoveEnabled },
    materials: clone(materials),
    isExploded: !!state.isExploded,
    showAnnotations: !!state.showAnnotations,
    labelSize: state.labelSize || 1,
    ...(extras.calibration ? { calibration: { ...extras.calibration } } : {}),
    ...(extras.camera ? { camera: clone(extras.camera) } : {}),
  };
}

// blob: URLs only live as long as the page, so they have to be stored as Blobs.
export function collectBlobUrls(value: unknown, found = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    if (value.startsWith('blob:')) found.add(value);
  } else if (Array.isArray(value)) {
    value.forEach(item => collectBlobUrls(item, found));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach(item => collectBlobUrls(item, found));
  }
  return found;
}

export function replaceStrings<T>(value: T, replacements: Record<string, string>): T {
  if (typeof value === 'string') return (replacements[value] ?? value) as T;
  if (Array.isArray(value)) return value.map(item => replaceStrings(item, replacements)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceStrings(item, replacements)])) as T;
  }
  return value;
}

// Loading a model marks every part visible, so saved visibility is re-applied afterwards.
export function restoreVisibility(parts: string[], current: Record<string, boolean>, saved: Record<string, boolean>) {
  const next = { ...current };
  parts.forEach(id => { next[id] = saved[id] !== false; });
  return next;
}

export function nextSlideIndex(current: number, count: number, step: 1 | -1 = 1) {
  if (count <= 0) return 0;
  return ((current + step) % count + count) % count;
}
