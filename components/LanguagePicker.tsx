import React from 'react';
import { Globe } from 'lucide-react';
import { t, useLanguage, readLanguage } from '../services/i18n';

export const LanguagePicker = () => {
  const { language, setLanguage } = useLanguage();
  return (
    <label className="pointer-events-auto flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-950/80 px-2 text-zinc-300 backdrop-blur-md">
      <Globe size={14} aria-hidden="true" />
      <select aria-label={t('Language')} title={t('Language')} value={language}
        onChange={event => setLanguage(readLanguage(event.target.value))}
        className="max-w-[92px] cursor-pointer bg-zinc-950 text-[11px] text-zinc-200 outline-none">
        <option value="en">English</option>
        <option value="id">Indonesia</option>
      </select>
    </label>
  );
};
