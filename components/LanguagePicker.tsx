import React from 'react';
import { Globe, Sun, Moon } from 'lucide-react';
import { t, useLanguage, readLanguage } from '../services/i18n';
import { useTheme } from '../services/theme';

export const LanguagePicker = () => {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const themeLabel = t(theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  return (
    <div className="flex shrink-0 items-center gap-2">
    <label className="pointer-events-auto flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-950/80 px-2 text-zinc-300 backdrop-blur-md">
      <Globe size={14} aria-hidden="true" />
      <select aria-label={t('Language')} title={t('Language')} value={language}
        onChange={event => setLanguage(readLanguage(event.target.value))}
        className="max-w-[92px] cursor-pointer bg-zinc-950 text-[11px] text-zinc-200 outline-none">
        <option value="en">English</option>
        <option value="id">Indonesia</option>
      </select>
    </label>
    <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={themeLabel} aria-label={themeLabel} aria-pressed={theme === 'light'}
      className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/80 text-zinc-300 backdrop-blur-md transition-colors hover:bg-zinc-800">
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
    </div>
  );
};
