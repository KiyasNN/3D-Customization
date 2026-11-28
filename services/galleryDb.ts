import type { GalleryMeta, GalleryPayload } from './gallerySnapshot';

// Light metadata (name, thumbnail) is kept apart from the heavy model files
// so the gallery grid can be listed without reading every model.
const DB_NAME = 'nk-gallery';
const DB_VERSION = 1;
const META = 'meta';
const PAYLOAD = 'payload';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not available in this browser.'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(PAYLOAD)) db.createObjectStore(PAYLOAD, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}

function run<T>(stores: string[], mode: IDBTransactionMode, work: (tx: IDBTransaction) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDb().then(db => new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    const request = work(tx);
    tx.oncomplete = () => resolve(request ? request.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Gallery transaction aborted.'));
  }));
}

export async function listGalleryMeta(): Promise<GalleryMeta[]> {
  const items = (await run<GalleryMeta[]>([META], 'readonly', tx => tx.objectStore(META).getAll())) || [];
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

export function getGalleryPayload(id: string) {
  return run<GalleryPayload>([PAYLOAD], 'readonly', tx => tx.objectStore(PAYLOAD).get(id));
}

export async function putGalleryItem(meta: GalleryMeta, payload: GalleryPayload) {
  await run([META, PAYLOAD], 'readwrite', tx => {
    tx.objectStore(META).put(meta);
    tx.objectStore(PAYLOAD).put(payload);
  });
}

export async function putGalleryMeta(meta: GalleryMeta) {
  await run([META], 'readwrite', tx => { tx.objectStore(META).put(meta); });
}

export async function deleteGalleryRecord(id: string) {
  await run([META, PAYLOAD], 'readwrite', tx => {
    tx.objectStore(META).delete(id);
    tx.objectStore(PAYLOAD).delete(id);
  });
}
