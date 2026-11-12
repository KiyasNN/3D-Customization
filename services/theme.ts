import { useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';
const storageKey = 'nk_ui_theme';
export function readTheme(value: unknown): Theme { return value === 'light' ? 'light' : 'dark'; }
let theme: Theme = 'dark';
try { theme = readTheme(localStorage.getItem(storageKey)); } catch { /* Storage is optional. */ }
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function applyTheme() {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}
export function setTheme(next: Theme) {
  theme = readTheme(next);
  try { localStorage.setItem(storageKey, theme); } catch { /* Keep the current session usable. */ }
  applyTheme();
  listeners.forEach(listener => listener());
}
export function useTheme() {
  return { theme: useSyncExternalStore(subscribe, () => theme, () => 'dark' as Theme), setTheme };
}
applyTheme();
