import assert from 'node:assert/strict';
import test from 'node:test';
import { MeshStandardMaterial, MeshPhysicalMaterial, Texture, DataTexture } from 'three';
import { tintMaterial, configureImportedMaterial } from '../services/materialTint.ts';

test('palette changes base color while preserving imported maps and PBR settings', () => {
  const source = new MeshPhysicalMaterial({
    color: '#ffffff', map: new Texture(), normalMap: new Texture(),
    roughnessMap: new Texture(), metalnessMap: new Texture(), aoMap: new Texture(),
    roughness: 0.7, metalness: 0.2, clearcoat: 0.8, transparent: true, opacity: 0.6,
  });
  source.map.flipY = false;
  source.map.repeat.set(2, 3);
  source.onBeforeCompile = () => {};
  const tinted = tintMaterial(source, '#ff0000');
  assert.notEqual(tinted, source);
  assert.equal(tinted.color.getHexString(), 'ff0000');
  assert.equal(source.color.getHexString(), 'ffffff');
  for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap',
    'roughness', 'metalness', 'clearcoat', 'transparent', 'opacity', 'onBeforeCompile']) {
    assert.equal(tinted[key], source[key], key);
  }
  assert.equal(tinted.map.flipY, false);
  assert.deepEqual(tinted.map.repeat.toArray(), [2, 3]);
  tinted.dispose();
});

test('multi-material mesh retains every slot; tinting does not modify shared materials', () => {
  const shared = new MeshStandardMaterial({ color: '#ffffff', map: new Texture() });
  const other = new MeshStandardMaterial({ map: new Texture() });
  const tinted = tintMaterial([shared, other], '#00ff00');
  assert.equal(tinted.length, 2);
  tinted.forEach((material, i) => {
    assert.equal(material.color.getHexString(), '00ff00');
    assert.equal(material.map, [shared, other][i].map);
  });
  const blue = tintMaterial(shared, '#0000ff');
  assert.equal(shared.color.getHexString(), 'ffffff');
  assert.equal(tinted[0].color.getHexString(), '00ff00');
  assert.equal(blue.color.getHexString(), '0000ff');
});

test('no palette selection leaves original imported material intact', () => {
  const source = new MeshStandardMaterial();
  assert.equal(tintMaterial(source), source);
});

test('slot tint changes only the requested material and retains all maps', () => {
  const source = [new MeshStandardMaterial({ color: '#ff0000', map: new Texture() }),
    new MeshStandardMaterial({ color: '#ffffff', map: new Texture() }),
    new MeshStandardMaterial({ color: '#000000', map: new Texture() })];
  const tinted = tintMaterial(source, undefined, { 1: '#00ff00' });
  assert.deepEqual(tinted.map(m => m.color.getHexString()), ['ff0000', '00ff00', '000000']);
  assert.deepEqual(source.map(m => m.color.getHexString()), ['ff0000', 'ffffff', '000000']);
  tinted.forEach((mat, i) => assert.equal(mat.map, source[i].map));
});

test('slot tint overrides object tint without affecting other slots', () => {
  const source = [new MeshStandardMaterial(), new MeshStandardMaterial()];
  const tinted = tintMaterial(source, '#ff0000', { 1: '#0000ff' });
  assert.deepEqual(tinted.map(m => m.color.getHexString()), ['ff0000', '0000ff']);
});

test('roughness edits apply to imported GLB materials while preserving PBR maps', () => {
  const source = new MeshPhysicalMaterial({ roughness: 0.83, metalness: 0.2,
    map: new Texture(), roughnessMap: new Texture(), normalMap: new Texture() });
  const unchanged = configureImportedMaterial(source);
  assert.equal(unchanged.roughness, 0.83);
  const edited = configureImportedMaterial(source, 0.12);
  assert.equal(edited.roughness, 0.12);
  assert.equal(source.roughness, 0.83);
  for (const key of ['map', 'normalMap', 'roughnessMap', 'metalness']) {
    assert.equal(edited[key], source[key], key);
  }
  const tinted = tintMaterial(edited, '#ff0000');
  assert.equal(tinted.roughness, 0.12);
  assert.equal(tinted.map, source.map);
});

test('roughness overrides cover all slots without modifying shared originals', () => {
  const source = [new MeshStandardMaterial({ roughness: 0.2 }), new MeshStandardMaterial({ roughness: 0.9 })];
  const edited = configureImportedMaterial(source, 0.6, true);
  assert.deepEqual(edited.map(m => m.roughness), [0.6, 0.6]);
  assert.deepEqual(source.map(m => m.roughness), [0.2, 0.9]);
  assert.ok(edited.every(m => m.wireframe));
  assert.ok(source.every(m => !m.wireframe));
});

test('palette replaces dark imported albedo but retains normal and PBR maps', () => {
  const darkMap = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  const source = new MeshPhysicalMaterial({ color: '#000000', map: darkMap,
    normalMap: new Texture(), roughnessMap: new Texture(), metalnessMap: new Texture(),
    aoMap: new Texture(), roughness: 0.4, metalness: 0.1, vertexColors: true });
  const colored = tintMaterial(source, '#ff0000', undefined, true);
  assert.equal(colored.color.getHexString(), 'ff0000');
  assert.equal(colored.map, null);
  assert.equal(colored.vertexColors, false);
  for (const key of ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'roughness', 'metalness']) {
    assert.equal(colored[key], source[key], key);
  }
  assert.equal(source.map, darkMap);
  assert.equal(source.vertexColors, true);
  assert.equal(source.color.getHexString(), '000000');
  assert.equal(tintMaterial(source, undefined, undefined, true), source);
});

test('solid GLB palette color preserves cutout alpha without sampling diffuse RGB', () => {
  const source = new MeshStandardMaterial({ map: new Texture(), alphaTest: 0.5 });
  let sourceHookCalled = false;
  source.onBeforeCompile = () => { sourceHookCalled = true; };
  const colored = tintMaterial(source, '#ffffff', undefined, true);
  const shader = { fragmentShader: '#include <map_fragment>', uniforms: {} };
  colored.onBeforeCompile(shader, {});
  assert.equal(sourceHookCalled, true);
  assert.equal(colored.map, source.map);
  assert.equal(colored.alphaTest, 0.5);
  assert.match(shader.fragmentShader, /diffuseColor\.a \*= sampledDiffuseColor\.a/);
  assert.doesNotMatch(shader.fragmentShader, /diffuseColor \*= sampledDiffuseColor/);
  assert.notEqual(colored.customProgramCacheKey(), source.customProgramCacheKey());
});
