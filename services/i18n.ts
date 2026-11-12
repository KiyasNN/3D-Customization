import { useSyncExternalStore } from 'react';
import messages from '../data/translations.json' with { type: 'json' };

export type Language = 'en' | 'id';
const storageKey = 'nk_ui_language';
export function readLanguage(value: unknown): Language { return value === 'id' ? 'id' : 'en'; }
let language: Language = 'en';
try { language = readLanguage(localStorage.getItem(storageKey)); } catch { /* Storage may be unavailable. */ }
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function setLanguage(next: Language) {
  language = readLanguage(next);
  try { localStorage.setItem(storageKey, language); } catch { /* Keep working without persistence. */ }
  if (typeof document !== 'undefined') document.documentElement.lang = language;
  listeners.forEach(listener => listener());
}
export function useLanguage() {
  const current = useSyncExternalStore(subscribe, () => language, () => 'en' as Language);
  return { language: current, setLanguage };
}

export function translate(text: string, locale: Language, values: unknown[] = []): string {
  const dictionary = messages as Record<string, string[]>;
  const entry = Object.prototype.hasOwnProperty.call(dictionary, text) ? dictionary[text] : undefined;
  const translated = entry ? entry[locale === 'en' ? 0 : 1] : text;
  return translated.replace(/\{(\d+)\}/g, (match, index) => values[Number(index)] === undefined ? match : String(values[Number(index)]));
}
export function t(text: string, values: unknown[] = []) { return translate(text, language, values); }

if (typeof document !== 'undefined') document.documentElement.lang = language;
