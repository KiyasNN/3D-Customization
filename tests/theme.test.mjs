import assert from 'node:assert/strict';
import test from 'node:test';
import { readTheme, setTheme } from '../services/theme.ts';

test('theme retains dark default and validates stored preferences', () => {
  assert.equal(readTheme(null), 'dark');
  assert.equal(readTheme('invalid'), 'dark');
  assert.equal(readTheme('light'), 'light');
});

test('theme switch persists and updates native controls and document styling', () => {
  const storage = new Map();
  globalThis.localStorage = { setItem: (key, value) => storage.set(key, value) };
  globalThis.document = { documentElement: { dataset: {}, style: {} } };
  try {
    setTheme('light');
    assert.equal(document.documentElement.dataset.theme, 'light');
    assert.equal(document.documentElement.style.colorScheme, 'light');
    assert.equal(storage.get('nk_ui_theme'), 'light');
    setTheme('dark');
    assert.equal(document.documentElement.dataset.theme, 'dark');
  } finally {
    delete globalThis.document;
    delete globalThis.localStorage;
  }
});
