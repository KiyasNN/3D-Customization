import assert from 'node:assert/strict';
import test from 'node:test';
import {
  captureDesignState, collectBlobUrls, nextSlideIndex, replaceStrings, restoreVisibility,
} from '../services/gallerySnapshot.ts';

const baseState = () => ({
  partMaterials: { Sole: 'mat-rubber', Logo: 'custom-1' },
  partConfigs: { Sole: { scale: 2, normalScale: 1, roughness: 0.5, displacementScale: 0, explosionOffset: [0, -1, 0], meshRotation: [0, 1, 0] } },
  partTextureScales: { Sole: 2 },
  partAnnotations: { Sole: { title: 'Sole', description: 'Rubber', offset: 60 } },
  partVisibility: { Sole: true, Logo: false },
  groupMoveEnabled: { Sole: false },
  materials: [
    { id: 'mat-rubber', name: 'Rubber', color: '#000', roughness: 1, metalness: 0, type: 'rubber' },
    { id: 'custom-1', name: 'Mine', color: '#fff', roughness: 0.5, metalness: 0, type: 'fabric', textureUrl: 'blob:http://x/1' },
    { id: 'custom-unused', name: 'Unused', color: '#fff', roughness: 0.5, metalness: 0, type: 'fabric' },
    { id: 'live-video', name: 'Cam', color: '#fff', roughness: 0.5, metalness: 0, type: 'video' },
  ],
  isExploded: true,
  showAnnotations: true,
  labelSize: 1.2,
});

test('captures explode offsets, transforms, annotations and only the custom materials in use', () => {
  const state = baseState();
  state.partMaterials.Heel = 'live-video';
  const camera = { position: [1, 2, 3], target: [0, 0.5, 0] };
  const snap = captureDesignState(state, new Set(['mat-rubber']), { camera });
  assert.deepEqual(snap.partConfigs.Sole.explosionOffset, [0, -1, 0]);
  assert.deepEqual(snap.partConfigs.Sole.meshRotation, [0, 1, 0]);
  assert.equal(snap.partAnnotations.Sole.description, 'Rubber');
  assert.deepEqual(snap.materials.map(m => m.id), ['custom-1']);
  assert.equal(snap.isExploded, true);
  assert.deepEqual(snap.camera, camera);

  // The snapshot must not share references with live state.
  state.partConfigs.Sole.explosionOffset[1] = 5;
  state.partAnnotations.Sole.title = 'changed';
  camera.position[0] = 9;
  assert.deepEqual(snap.partConfigs.Sole.explosionOffset, [0, -1, 0]);
  assert.equal(snap.partAnnotations.Sole.title, 'Sole');
  assert.deepEqual(snap.camera.position, [1, 2, 3]);
});

test('finds session blob URLs anywhere in a snapshot and swaps them for new ones', () => {
  const snap = captureDesignState(baseState(), new Set(['mat-rubber']));
  snap.partConfigs.Sole.projectedImageUrl = 'blob:http://x/2';
  assert.deepEqual([...collectBlobUrls(snap)].sort(), ['blob:http://x/1', 'blob:http://x/2']);
  const restored = replaceStrings(snap, { 'blob:http://x/1': 'blob:http://y/a', 'blob:http://x/2': 'blob:http://y/b' });
  assert.equal(restored.materials[0].textureUrl, 'blob:http://y/a');
  assert.equal(restored.partConfigs.Sole.projectedImageUrl, 'blob:http://y/b');
  assert.deepEqual(restored.partConfigs.Sole.explosionOffset, [0, -1, 0]);
  assert.equal(snap.materials[0].textureUrl, 'blob:http://x/1');
});

test('re-applies saved visibility after a model load marks every part visible', () => {
  const next = restoreVisibility(['Sole', 'Logo', 'New'], { Sole: true, Logo: true, New: true, Other: false }, { Sole: true, Logo: false });
  assert.deepEqual(next, { Sole: true, Logo: false, New: true, Other: false });
});

test('slideshow index wraps in both directions', () => {
  assert.equal(nextSlideIndex(2, 3), 0);
  assert.equal(nextSlideIndex(0, 3, -1), 2);
  assert.equal(nextSlideIndex(0, 0), 0);
});
