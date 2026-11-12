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
