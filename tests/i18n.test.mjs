import assert from 'node:assert/strict';
import test from 'node:test';
import { readLanguage, translate, t, setLanguage } from '../services/i18n.ts';

test('language defaults to English and only supports configured locales', () => {
  assert.equal(readLanguage(null), 'en');
  assert.equal(readLanguage('fr'), 'en');
  assert.equal(readLanguage('id'), 'id');
  assert.equal(t('Fit View'), 'Fit View');
});

test('default English translates existing Indonesian UI copy', () => {
  assert.equal(translate('Tampilkan lebih banyak', 'en'), 'Show more');
  assert.equal(translate('Warna tidak ditemukan.', 'en'), 'No colors found.');
  assert.equal(translate('Belum Ada Produk Dipilih', 'en'), 'No Model Selected');
});

test('Indonesian covers tools, loading and interpolated status messages', () => {
  assert.equal(translate('Fit View', 'id'), 'Paskan Tampilan');
  assert.equal(translate('Loading engine…', 'id'), 'Memuat mesin…');
  assert.equal(translate('Trial ({0} days)', 'id', [7]), 'Uji Coba (7 hari)');
  assert.equal(translate('Loading Asset • {0}%', 'en', [40]), 'Loading Asset • 40%');
  assert.equal(translate('My Uploaded Model', 'id'), 'My Uploaded Model');
});

test('language changes persist and update the document language', () => {
  const values = new Map();
  globalThis.localStorage = { setItem: (key, value) => values.set(key, value) };
  globalThis.document = { documentElement: { lang: 'en' } };
  try {
    setLanguage('id');
    assert.equal(t('Save'), 'Simpan');
    assert.equal(values.get('nk_ui_language'), 'id');
    assert.equal(document.documentElement.lang, 'id');
    setLanguage('en');
    assert.equal(t('Save'), 'Save');
  } finally {
    setLanguage('en');
    delete globalThis.localStorage;
    delete globalThis.document;
  }
});
