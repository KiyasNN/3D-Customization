import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'vite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

// Build the actual store so its TypeScript imports resolve exactly as in the app.
const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = path.join(root, 'tmp', 'store-color-test');
await build({
  configFile: false, root, logLevel: 'silent',
  build: {
    outDir, emptyOutDir: false,
    lib: { entry: path.join(root, 'store.ts'), formats: ['es'], fileName: () => 'store.mjs' },
    rollupOptions: { external: id => !id.startsWith('.') && !path.isAbsolute(id) },
  },
});
const { useStore } = await import(pathToFileURL(path.join(outDir, 'store.mjs')).href);

test('grouped objects retain independent colors and materials through undo/redo', () => {
  const target = 'Midsole_paint', sibling = 'Midsole__nk003';
  const { setCustomParts, selectPart, setPartColor, setMaterial, undo, redo } = useStore.getState();
  setCustomParts([target, sibling]);
  assert.deepEqual(useStore.getState().partGroups.Midsole, [target, sibling]);
  selectPart(sibling);
  setPartColor(sibling, '#0000ff');
  setMaterial(sibling, 'sibling-material');
  selectPart(target);
  setPartColor(target, '#ff0000');
  assert.equal(useStore.getState().partConfigs[target].diffuseColor, '#ff0000');
  assert.equal(useStore.getState().partConfigs[sibling].diffuseColor, '#0000ff');
  undo();
  assert.equal(useStore.getState().partConfigs[target]?.diffuseColor, undefined);
  assert.equal(useStore.getState().partConfigs[sibling].diffuseColor, '#0000ff');
  redo();
  assert.equal(useStore.getState().partConfigs[target].diffuseColor, '#ff0000');
  setMaterial(target, 'target-material');
  assert.equal(useStore.getState().partMaterials[target], 'target-material');
  assert.equal(useStore.getState().partMaterials[sibling], 'sibling-material');
  assert.deepEqual(useStore.getState().partGroups.Midsole, [target, sibling]);
});

test('stitch and body join the same root group while retaining independent palette colors', () => {
  const body = 'Bootie_Binding_1', stitch = 'Stitch_Bootie_Binding_1';
  const { setCustomParts, setPartColor } = useStore.getState();
  setCustomParts([body, stitch, 'Bootie_Lateral_1']);
  assert.deepEqual(useStore.getState().partGroups.Bootie, [body, stitch, 'Bootie_Lateral_1']);
  setPartColor(stitch, '#ffffff');
  setPartColor(body, '#ff0000');
  assert.equal(useStore.getState().partConfigs[body].diffuseColor, '#ff0000');
  assert.equal(useStore.getState().partConfigs[stitch].diffuseColor, '#ffffff');
});
