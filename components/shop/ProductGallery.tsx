'use client';

import { useState, useEffect, useCallback, useRef, MouseEvent } from 'react';
import clsx from 'clsx';
import type { ProductImage } from '@/lib/supabase/types';

type ProductGalleryProps = {
  images: ProductImage[];
};

export function ProductGallery({ images }: ProductGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lightboxIdx === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowLeft') setLightboxIdx((lightboxIdx! - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setLightboxIdx((lightboxIdx! + 1) % images.length);
    }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightboxIdx, images.length]);

  const next = useCallback(() => {
    if (lightboxIdx === null) return;
    setLightboxIdx((lightboxIdx + 1) % images.length);
  }, [lightboxIdx, images.length]);
  const prev = useCallback(() => {
    if (lightboxIdx === null) return;
    setLightboxIdx((lightboxIdx - 1 + images.length) % images.length);
  }, [lightboxIdx, images.length]);

  function onMainMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoom({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  if (images.length === 0) {
    return (
      <div className="aspect-square overflow-hidden rounded-lg bg-brand-100">
        <img src="/placeholder.svg" alt="No image" className="h-full w-full object-cover" />
      </div>
    );
  }

  const active = images[activeIdx];

  return (
    <div>
      {/* Main image with hover zoom + click-to-lightbox */}
      <div
        ref={mainRef}
        className="group relative aspect-square overflow-hidden rounded-lg bg-brand-100 cursor-zoom-in"
        onMouseMove={onMainMove}
        onMouseLeave={() => setZoom(null)}
      >
        <img
          src={active.url}
          alt={active.alt_text || 'Product image'}
          className={clsx(
            'h-full w-full select-none object-cover transition-transform duration-150 ease-out',
            zoom ? '' : 'group-hover:scale-105'
          )}
          style={
            zoom
              ? {
                  transformOrigin: `${zoom.x}% ${zoom.y}%`,
                  transform: 'scale(2.4)',
                  transition: 'transform 80ms linear',
                }
              : undefined
          }
          onClick={() => setLightboxIdx(activeIdx)}
          draggable={false}
        />

        {/* Floating "Full view" button — always visible on mobile, hover-revealed on desktop */}
        <button
          type="button"
          onClick={() => setLightboxIdx(activeIdx)}
          className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-md bg-white/95 px-3 py-1.5 text-xs font-medium text-brand-900 shadow-md backdrop-blur-sm sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100 transition-opacity"
          aria-label="View full image"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
          Full view
        </button>

        {/* Hint pill on hover */}
        <div className="pointer-events-none absolute left-3 bottom-3 hidden sm:flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          Hover to zoom · Click for full view
        </div>

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute left-3 bottom-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white">
            {activeIdx + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={clsx(
                'aspect-square overflow-hidden rounded border-2 transition-colors',
                i === activeIdx ? 'border-brand-900' : 'border-transparent hover:border-brand-300'
              )}
              aria-label={`View image ${i + 1}`}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox / full-view modal */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Product image full view"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}
            className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
            aria-label="Close full view"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>

          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
              aria-label="Previous image"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[lightboxIdx].url}
              alt={images[lightboxIdx].alt_text || 'Product image'}
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
          </div>

          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
              aria-label="Next image"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
              {lightboxIdx + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}