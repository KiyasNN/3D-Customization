import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react';
import { t, useLanguage } from '../services/i18n';
import { openGalleryItem, stepSlideshow, stopSlideshow, togglePause, useGalleryStore } from '../services/gallery';

// Full-screen presentation overlay that cycles through the saved gallery.
export const GalleryPlayer = () => {
  useLanguage();
  const { items, playIndex, paused, intervalSec } = useGalleryStore();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const item = items[playIndex];

  useEffect(() => {
    if (!item) { stopSlideshow(); return; }
    let cancelled = false;
    setReady(false);
    setFailed(null);
    openGalleryItem(item.id, { present: true })
      .catch(err => { if (!cancelled) setFailed(err instanceof Error ? err.message : String(err)); })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [item?.id]);

  useEffect(() => {
    if (!ready || paused || items.length < 2) return;
    const timer = setTimeout(() => stepSlideshow(1), (failed ? 2 : intervalSec) * 1000);
    return () => clearTimeout(timer);
  }, [ready, paused, failed, intervalSec, items.length, playIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stopSlideshow();
      else if (e.key === 'ArrowRight') stepSlideshow(1);
      else if (e.key === 'ArrowLeft') stepSlideshow(-1);
      else if (e.key === ' ') { e.preventDefault(); togglePause(); }
    };
    // Leaving browser fullscreen (Esc) also ends the slideshow.
    const onFullscreen = () => { if (!document.fullscreenElement) stopSlideshow(); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, []);

  if (!item) return null;
  const buttonClass = 'flex h-9 w-9 items-center justify-center rounded-full text-zinc-200 transition-colors hover:bg-white/10 hover:text-white';

  return (
    <div className="pointer-events-none absolute inset-0 z-[120] flex flex-col justify-end p-4 sm:p-6">
      <div className="pointer-events-auto relative mx-auto flex w-full max-w-xl items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 px-3 py-2 shadow-2xl backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{item.name}</p>
          <p className="truncate text-[11px] text-zinc-400">
            {failed ? t(failed) : ready ? `${playIndex + 1} / ${items.length} · ${item.modelName}` : t('Loading…')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => stepSlideshow(-1)} disabled={items.length < 2} className={buttonClass} title={t('Previous')} aria-label={t('Previous')}><ChevronLeft size={18} /></button>
          <button type="button" onClick={togglePause} className={buttonClass} title={paused ? t('Resume') : t('Pause')} aria-label={paused ? t('Resume') : t('Pause')}>
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button type="button" onClick={() => stepSlideshow(1)} disabled={items.length < 2} className={buttonClass} title={t('Next')} aria-label={t('Next')}><ChevronRight size={18} /></button>
          <button type="button" onClick={stopSlideshow} className={buttonClass} title={t('Exit slideshow')} aria-label={t('Exit slideshow')}><X size={18} /></button>
        </div>
        {ready && !paused && items.length > 1 && (
          <div
            key={`${playIndex}-${intervalSec}`}
            className="gallery-progress absolute bottom-0 left-0 h-0.5 w-full origin-left bg-blue-500"
            style={{ animationDuration: `${failed ? 2 : intervalSec}s` }}
          />
        )}
      </div>
    </div>
  );
};
