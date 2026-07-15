'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useWishlist } from '@/lib/wishlist/store';
import { formatRand, calcDiscountPercent } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';
import { AddToCartButton } from './AddToCartButton';
import type { ProductVariant } from '@/lib/supabase/types';
import clsx from 'clsx';

type ProductCardProps = {
  slug: string;
  name: string;
  priceCents: number;
  compareAtCents?: number | null;
  imageUrl: string;
  // For hover preview (optional — if not provided, preview is hidden)
  description?: string;
  variants?: ProductVariant[];
  categoryName?: string;
};

export function ProductCard({ slug, name, priceCents, compareAtCents, imageUrl, description, variants, categoryName }: ProductCardProps) {
  const onSale = compareAtCents != null && compareAtCents > priceCents;
  const discountPct = calcDiscountPercent(priceCents, compareAtCents);
  const [hover, setHover] = useState(false);
  const [previewPinned, setPreviewPinned] = useState(false);
  const inWishlist = useWishlist((s) => s.items.some((i) => i.productSlug === slug));
  const toggleWishlist = useWishlist((s) => s.toggle);
  const showToast = useToast((s) => s.show);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showPreview = (hover || previewPinned) && (description || variants);

  function onEnter() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHover(true), 300);
  }
  function onLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHover(false);
    setPreviewPinned(false);
  }

  function onWishlistClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleWishlist({
      variantId: slug,
      productSlug: slug,
      name,
      priceCents,
      imageUrl
    });
    showToast(added ? 'Added to wishlist' : 'Removed from wishlist', added ? 'success' : 'info');
  }

  return (
    <div
      className="group relative"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <Link href={`/p/${slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-md bg-brand-100">
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Top-left badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
            {onSale && (
              <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                {discountPct}% OFF
              </span>
            )}
          </div>

          {/* Wishlist heart (top-right) — appears on hover */}
          <button
            type="button"
            onClick={onWishlistClick}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            className={clsx(
              'absolute top-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm backdrop-blur-sm transition-all',
              'opacity-0 group-hover:opacity-100',
              inWishlist && 'opacity-100'
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={inWishlist ? '#dc2626' : 'none'} stroke={inWishlist ? '#dc2626' : 'currentColor'} strokeWidth="2" className={inWishlist ? '' : 'text-brand-700'} aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          </button>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-sm font-medium text-brand-950 line-clamp-1">{name}</p>
        </div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-sm font-semibold text-brand-950">{formatRand(priceCents)}</span>
          {onSale && compareAtCents && (
            <span className="text-xs text-brand-500 line-through">{formatRand(compareAtCents)}</span>
          )}
        </div>
      </Link>

      {/* Hover preview — appears on hover or when pinned (click) */}
      {showPreview && (
        <div
          className="absolute left-0 right-0 top-0 z-30 mt-1 hidden md:block"
          // hidden on mobile (md+ only)
        >
          <div className="rounded-lg border border-brand-200 bg-white p-3 shadow-2xl">
            <div className="flex gap-3">
              <img src={imageUrl} alt="" className="h-20 w-20 flex-shrink-0 rounded object-cover" />
              <div className="flex-1 min-w-0">
                {categoryName && (
                  <p className="text-[10px] uppercase tracking-wide text-brand-500">{categoryName}</p>
                )}
                <p className="text-sm font-semibold text-brand-950 line-clamp-1">{name}</p>
                <p className="mt-0.5 text-sm font-semibold text-brand-900">
                  {formatRand(priceCents)}
                  {onSale && compareAtCents && (
                    <span className="ml-2 text-xs text-brand-500 line-through font-normal">{formatRand(compareAtCents)}</span>
                  )}
                </p>
                {description && (
                  <p className="mt-1 text-xs text-brand-600 line-clamp-2">{description}</p>
                )}
                <div className="mt-2 flex gap-1">
                  {variants && variants.length > 0 && (
                    <span className="text-[10px] text-brand-500">
                      {variants.length} variant{variants.length === 1 ? '' : 's'} · {variants.reduce((acc, v) => acc + v.stock, 0)} in stock
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {variants && variants.length > 0 && (
                <AddToCartButton
                  productId={variants[0].product_id}
                  productSlug={slug}
                  productName={name}
                  imageUrl={imageUrl}
                  variants={variants}
                  basePriceCents={priceCents}
                  size="sm"
                />
              )}
            </div>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setPreviewPinned((p) => !p); }}
              className="mt-2 w-full text-[10px] text-brand-500 hover:text-brand-700"
            >
              {previewPinned ? 'Click to unpin preview' : 'Click to pin preview'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}