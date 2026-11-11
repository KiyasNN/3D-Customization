import assert from 'node:assert/strict';
import test from 'node:test';
import { MeshStandardMaterial, MeshPhysicalMaterial, Texture } from 'three';
import { tintMaterial } from '../services/materialTint.ts';

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
