import React, { useEffect, useState } from 'react';
import { GalleryHorizontalEnd, Pencil, Play, Plus, Trash2, Upload } from 'lucide-react';
import { t, useLanguage } from '../services/i18n';
import {
  deleteGalleryItem, GALLERY_INTERVALS, openGalleryItem, refreshGallery, renameGalleryItem,
  saveCurrentToGallery, setGalleryInterval, startSlideshow, useGalleryStore,
} from '../services/gallery';

// Gallery tab: saved scenes (model + explode/transform + annotations) kept in this browser.
export const GalleryPanel = () => {
  useLanguage();
  const { items, loaded, busy, error, intervalSec, activeId } = useGalleryStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => { if (!loaded) refreshGallery(); }, [loaded]);

  const commitRename = async () => {
    if (editingId) await renameGalleryItem(editingId, draftName).catch(() => {});
    setEditingId(null);
  };

  const open = async (id: string) => {
    setOpeningId(id);
    try { await openGalleryItem(id); } catch (err) {
      useGalleryStore.setState({ error: err instanceof Error ? err.message : String(err) });
    } finally { setOpeningId(null); }
  };

  return (
    <div className="flex w-full flex-col gap-3 sm:w-72">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => saveCurrentToGallery().catch(() => {})}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? <Upload size={14} className="animate-pulse" /> : <Plus size={14} />}
          {busy ? t('Saving…') : t('Save to Gallery')}
        </button>
        <button
          type="button"
          disabled={items.length === 0}
          onClick={() => startSlideshow(0)}
          title={t('Play slideshow')}
          aria-label={t('Play slideshow')}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:bg-white/10 disabled:opacity-40"
        >
          <Play size={14} /> {t('Play')}
        </button>
      </div>

      <label className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
        {t('Seconds per slide')}
        <select
          value={intervalSec}
          onChange={e => setGalleryInterval(Number(e.target.value))}
          className="rounded-md border border-white/10 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-blue-500"
        >
          {GALLERY_INTERVALS.map(value => <option key={value} value={value}>{t('{0} s', [value])}</option>)}
        </select>
      </label>

      {error && (
        <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-300">{t(error)}</p>
      )}

      {loaded && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center opacity-60">
          <GalleryHorizontalEnd size={32} className="mb-2 text-zinc-400" />
          <p className="text-xs text-zinc-300">{t('No gallery items yet.')}</p>
          <p className="mt-1 max-w-[220px] text-[10px] text-zinc-500">{t('Explode, arrange and annotate a model, then save it here.')}</p>
        </div>
      ) : (
        <div className="custom-scrollbar grid max-h-[380px] grid-cols-2 gap-3 overflow-y-auto pr-1">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`group relative h-fit overflow-hidden rounded-lg border bg-zinc-900/50 transition-all ${activeId === item.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-white/10 hover:border-blue-500/50'}`}
            >
              <button
                type="button"
                onClick={() => open(item.id)}
                title={t('Open in editor')}
                className="block aspect-video w-full bg-zinc-950 bg-cover bg-center"
                style={{ backgroundImage: item.thumbnail ? `url(${item.thumbnail})` : undefined }}
              >
                {openingId === item.id && (
                  <span className="flex h-full w-full items-center justify-center bg-black/50 text-[10px] text-white">{t('Opening…')}</span>
                )}
              </button>
              <div className="p-2">
                {editingId === item.id ? (
                  <input
                    autoFocus
                    value={draftName}
                    onChange={e => setDraftName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null); }}
                    aria-label={t('Rename')}
                    className="w-full rounded border border-blue-500 bg-zinc-800 px-1 py-0.5 text-[10px] text-white outline-none"
                  />
                ) : (
                  <p className="truncate text-[10px] font-medium text-white" title={item.name}>{item.name}</p>
                )}
                <p className="truncate text-[9px] text-zinc-500" title={item.modelName}>
                  {new Date(item.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' })} · {item.modelName}
                </p>
              </div>
              <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => startSlideshow(index)}
                  title={t('Play from here')}
                  aria-label={t('Play from here')}
                  className="rounded-full bg-black/70 p-1.5 text-white hover:bg-blue-600"
                ><Play size={11} /></button>
                <button
                  type="button"
                  onClick={() => { setEditingId(item.id); setDraftName(item.name); }}
                  title={t('Rename')}
                  aria-label={t('Rename')}
                  className="rounded-full bg-black/70 p-1.5 text-white hover:bg-zinc-600"
                ><Pencil size={11} /></button>
                <button
                  type="button"
                  onClick={() => { if (confirm(t('Delete "{0}" from the gallery?', [item.name]))) deleteGalleryItem(item.id); }}
                  title={t('Delete')}
                  aria-label={t('Delete')}
                  className="rounded-full bg-black/70 p-1.5 text-white hover:bg-red-600"
                ><Trash2 size={11} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[9px] leading-snug text-zinc-500">{t('Saved in this browser only. Clearing site data removes the gallery.')}</p>
    </div>
  );
};
