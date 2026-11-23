import assert from 'node:assert/strict';
import test from 'node:test';
import { Group, Mesh, Vector3 } from 'three';
import { build } from 'vite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

// Bundle the service so its extensionless TypeScript imports resolve as in the app.
const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = path.join(root, 'tmp', 'part-movement-test');
await build({
  configFile: false, root, logLevel: 'silent',
  build: {
    outDir, emptyOutDir: false,
    lib: { entry: path.join(root, 'services/partMovement.ts'), formats: ['es'], fileName: () => 'partMovement.mjs' },
    rollupOptions: { external: id => !id.startsWith('.') && !path.isAbsolute(id) },
  },
});
const { getPartRestWorldPosition, registerPartMovement } = await import(pathToFileURL(path.join(outDir, 'partMovement.mjs')).href);

test('rest position ignores drag offsets under nested transforms', () => {
  const root = new Group();
  root.position.set(4, -1, 2);
  root.rotation.set(0.2, 0.7, -0.3);
  root.scale.setScalar(2);
  const mesh = new Mesh();
  mesh.position.set(1, 2, 3);
  root.add(mesh);
  registerPartMovement(mesh, mesh.position.clone(), { current: 1 });
  const center = new Vector3(0.1, 0, -0.2);
  const before = getPartRestWorldPosition(mesh, center, new Vector3());

  mesh.position.add(new Vector3(5, -3, 0.5));
  const after = getPartRestWorldPosition(mesh, center, new Vector3());
  assert.ok(after.distanceTo(before) < 1e-9);
  assert.ok(mesh.localToWorld(center.clone()).distanceTo(before) > 1);
});

test('unregistered objects fall back to their live position', () => {
  const mesh = new Mesh();
  mesh.position.set(1, 2, 3);
  assert.deepEqual(getPartRestWorldPosition(mesh, new Vector3(), new Vector3()).toArray(), [1, 2, 3]);
});
