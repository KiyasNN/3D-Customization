import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { labToHex, parseAse } from '../scripts/build-csi-palette.mjs';

test('D50 Lab converts to expected sRGB black, white, gray and red', () => {
  assert.equal(labToHex([0, 0, 0]), '#000000');
  assert.equal(labToHex([100, 0, 0]), '#ffffff');
  assert.equal(labToHex([50, 0, 0]), '#777777');
  assert.equal(labToHex([54.2917, 80.8125, 69.8851]), '#ff0000');
});

test('published CSI ASE matches generated catalog without missing codes', () => {
  const colors = parseAse(fs.readFileSync(new URL('../data/ColorWall.ase', import.meta.url)));
  const generated = JSON.parse(fs.readFileSync(new URL('../data/csi-colorwall.json', import.meta.url), 'utf8'));
  assert.equal(colors.length, 3709);
  assert.deepEqual(colors, generated);
  assert.equal(new Set(colors.map(c => c.code)).size, colors.length);
  assert.equal(colors[0].code, '04-CW-0100080-MC');
  colors.forEach(c => {
    assert.match(c.hex, /^#[0-9a-f]{6}$/);
    assert.ok(c.lab[0] >= 0 && c.lab[0] <= 100);
  });
});
