'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';
import type { ProductVariant } from '@/lib/supabase/types';
import { AddToCartButton } from './AddToCartButton';
import { formatRand } from '@/lib/format';

type ProductQuickViewProps = {
  open: boolean;
  onClose: () => void;
  slug: string;
  name: string;
  priceCents: number;
  compareAtCents?: number | null;
  imageUrl: string;
  description?: string;
  variants: ProductVariant[];
  categoryName?: string;
  stock?: number;
};

export function ProductQuickView({ open, onClose, slug, name, priceCents, compareAtCents, imageUrl, description, variants, categoryName, stock }: ProductQuickViewProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector<HTMLElement>('[data-quick-view-dialog]');
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, [href], select, input, textarea, [tabindex]:not([tabindex="-1"])')).filter((el) => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  const discounted = compareAtCents != null && compareAtCents > priceCents;
  const content = (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Close quick view" />
      <section data-quick-view-dialog role="dialog" aria-modal="true" aria-labelledby="quick-view-title" className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl dark:bg-brand-900 md:max-w-2xl md:rounded-2xl">
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-brand-200 md:hidden" aria-hidden="true" />
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close quick view" className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-brand-700 shadow-sm hover:bg-white dark:bg-brand-800 dark:text-brand-100 dark:hover:bg-brand-700">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M6 18L18 6" /></svg>
        </button>
        <div className="grid gap-5 p-5 pt-8 md:grid-cols-2 md:p-6">
          <img src={imageUrl} alt={name} className="aspect-square w-full rounded-xl bg-brand-100 object-cover" />
          <div className="flex min-w-0 flex-col">
             {categoryName && <p className="text-xs font-medium uppercase tracking-wide text-brand-500 dark:text-brand-400">{categoryName}</p>}
            <h2 id="quick-view-title" className="mt-1 text-xl font-semibold text-brand-950 dark:text-white">{name}</h2>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg font-semibold text-brand-950 dark:text-white">{formatRand(priceCents)}</span>
             {discounted && <span className="text-sm text-brand-500 dark:text-brand-400 line-through">{formatRand(compareAtCents!)}</span>}
            </div>
            {description && <p className="mt-4 max-h-28 overflow-y-auto whitespace-pre-line text-sm leading-6 text-brand-700 dark:text-brand-200">{description}</p>}
            {variants.length > 0 && <div className="mt-4 flex flex-wrap gap-2"><span className="sr-only">Available variants</span>{variants.map((variant) => <span key={variant.id} className="rounded-full border border-brand-200 px-3 py-1 text-xs text-brand-700 dark:border-brand-600 dark:text-brand-100">{variant.name || Object.values(variant.options).join(' / ') || 'Standard'}</span>)}</div>}
             <p className="mt-4 text-xs text-brand-500 dark:text-brand-400">{stock && stock > 0 ? `${stock} in stock` : 'Currently unavailable'}</p>
            <div className="mt-auto pt-5">
              {variants.length > 0 ? <AddToCartButton productId={variants[0].product_id} productSlug={slug} productName={name} imageUrl={imageUrl} variants={variants} basePriceCents={priceCents} size="lg" /> : <p className="rounded-md bg-brand-100 px-4 py-3 text-center text-sm text-brand-600">Currently unavailable</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
  return createPortal(content, document.body);
}
