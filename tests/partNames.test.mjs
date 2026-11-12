import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPartName, mergeAutomaticPartGroups } from '../services/partNames.ts';

test('display names omit export suffixes without erasing meaningful numbers', () => {
  assert.equal(formatPartName('Bootie__Binding_1'), 'Bootie Binding');
  assert.equal(formatPartName('Heel.001'), 'Heel');
  assert.equal(formatPartName('StitchHeel_1'), 'Stitch Heel');
  assert.equal(formatPartName('Nike Air Max 90'), 'Nike Air Max 90');
});

test('Heel and Stitch Heel become one group with original IDs intact', () => {
  const parts = ['Heel_1', 'Stitch_Heel_1', 'Upper_1', 'Logo_Heel_1'];
  assert.deepEqual(mergeAutomaticPartGroups(parts), { Heel: ['Heel_1', 'Stitch_Heel_1', 'Logo_Heel_1'] });
  assert.deepEqual(parts, ['Heel_1', 'Stitch_Heel_1', 'Upper_1', 'Logo_Heel_1']);
});

test('manual groups take precedence and unrelated parts remain ungrouped', () => {
  const parts = ['Heel_1', 'Stitch_Heel_1', 'Upper_1', 'Outsole_1'];
  const manual = { Custom: ['Heel_1', 'Upper_1'] };
  assert.deepEqual(mergeAutomaticPartGroups(parts, manual), manual);
  assert.deepEqual(mergeAutomaticPartGroups(['Upper_1', 'Outsole_1']), {});
});

test('shortest existing parent name wins instead of nesting stitch groups', () => {
  assert.deepEqual(mergeAutomaticPartGroups(['Heel', 'Inner Heel', 'Stitch Inner Heel']), {
    Heel: ['Heel', 'Inner Heel', 'Stitch Inner Heel'],
  });
});

test('material-code variants form a Midsole group without a standalone Midsole mesh', () => {
  const parts = ['Midsole_nke 001', 'Midsole__nk003', 'Midsole_NKE_004', 'Upper_1'];
  assert.deepEqual(mergeAutomaticPartGroups(parts), {
    Midsole: ['Midsole_nke 001', 'Midsole__nk003', 'Midsole_NKE_004'],
  });
  // Child labels can still distinguish material variants; internal IDs are intact.
  assert.equal(formatPartName(parts[0]), 'Midsole nke 001');
  assert.equal(formatPartName(parts[1]), 'Midsole nk003');
  assert.equal(formatPartName(parts[2]), 'Midsole NKE 004');
  assert.equal(formatPartName('Midsole_NKE_004_1'), 'Midsole NKE 004');
});

test('material codes support case, separators and trailing export indices', () => {
  const parts = ['Midsole_NK-001_1', 'Midsole_nke002.001', 'Midsole_nK 003_2'];
  assert.deepEqual(mergeAutomaticPartGroups(parts), { Midsole: parts });
});

test('material suffix grouping combines with stitch grouping and separates other parts', () => {
  const parts = ['Midsole_nke001', 'Stitch Midsole_nk003', 'Heel_NKE001', 'Heel_NK002'];
  assert.deepEqual(mergeAutomaticPartGroups(parts), {
    Midsole: ['Midsole_nke001', 'Stitch Midsole_nk003'],
    Heel: ['Heel_NKE001', 'Heel_NK002'],
  });
});

test('material-code grouping leaves manual memberships unchanged', () => {
  const parts = ['Midsole_nke001', 'Midsole_nk003'];
  const manual = { Custom: ['Midsole_nke001'] };
  assert.deepEqual(mergeAutomaticPartGroups(parts, manual), manual);
});

test('all Midsole prefixes group together regardless of material suffix', () => {
  const parts = ['Midsole_paint', 'Midsole_nke 001', 'Midsole__nk003', 'Midsole_rubber_1'];
  assert.deepEqual(mergeAutomaticPartGroups(parts), { Midsole: parts });
});

test('leading part name creates groups even without material codes or a standalone base', () => {
  const parts = ['Midsole_paint_1', 'Midsole_Foam_2', 'Upper_mesh_1', 'Upper_fabric_1'];
  assert.deepEqual(mergeAutomaticPartGroups(parts), {
    Midsole: ['Midsole_paint_1', 'Midsole_Foam_2'],
    Upper: ['Upper_mesh_1', 'Upper_fabric_1'],
  });
});

test('spaces, double underscores and camel case share the same prefix rule', () => {
  const parts = ['Midsole Paint', 'Midsole__foam', 'MidsoleRubber', 'Heel_1', 'Stitch_Heel_1'];
  assert.deepEqual(mergeAutomaticPartGroups(parts), {
    Midsole: ['Midsole Paint', 'Midsole__foam', 'MidsoleRubber'],
    Heel: ['Heel_1', 'Stitch_Heel_1'],
  });
});
