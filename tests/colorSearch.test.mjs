import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { matchesColorSearch } from '../services/colorSearch.ts';

const swatch = hex => ({ hex, name: '04-CW-0000000-MC' });

test('blue search includes light, dark and saturated blue, excluding other families', () => {
  for (const hex of ['#0000ff', '#153c75', '#abcdef']) {
    assert.ok(matchesColorSearch(swatch(hex), ' BLUE '), hex);
    assert.ok(matchesColorSearch(swatch(hex), 'biru'), hex);
  }
  for (const hex of ['#ff0000', '#00ff00', '#ffff00', '#ffffff', '#777777']) {
    assert.equal(matchesColorSearch(swatch(hex), 'blue'), false, hex);
  }
});

test('family aliases and combined shade descriptions work', () => {
  for (const [hex, name] of [['#ff0000', 'merah'], ['#00ff00', 'green'], ['#ffff00', 'kuning'],
    ['#ffa500', 'orange'], ['#a0522d', 'brown'], ['#ffc0cb', 'pink'], ['#800080', 'ungu'],
    ['#ffffff', 'white'], ['#000000', 'hitam'], ['#777777', 'grey']]) {
    assert.ok(matchesColorSearch(swatch(hex), name), name);
  }
  assert.ok(matchesColorSearch(swatch('#abcdef'), 'light blue'));
  assert.ok(matchesColorSearch(swatch('#153c75'), 'dark blue'));
  assert.equal(matchesColorSearch(swatch('#ff0000'), 'light blue'), false);
});

test('names, CSI codes, HEX and empty searches still work', () => {
  const color = { code: '04-CW-0100080-MC', name: 'Electric Blue', hex: '#3b82f6' };
  for (const query of ['', '  ', 'electric', '0100080', '04-cw-0100080-mc', '#3b82f6', '3B82F6']) {
    assert.ok(matchesColorSearch(color, query), query);
  }
  assert.equal(matchesColorSearch(color, 'not-a-color'), false);
});

test('real CSI catalog returns a family of blue shades despite having code-only names', () => {
  const colors = JSON.parse(fs.readFileSync(new URL('../data/csi-colorwall.json', import.meta.url), 'utf8'));
  const blue = colors.filter(c => matchesColorSearch({ ...c, name: c.code }, 'blue'));
  assert.ok(blue.length > 100);
  assert.ok(blue.length < colors.length / 2);
});
