'use client';

import { useEffect, useState } from 'react';
import { pushRecentlyViewed } from '@/lib/utils/recently-viewed';

/**
 * Renders nothing visually — just records the view and exposes a hook for
 * low-stock display. Co-locates the tracking logic with PDP.
 */
export function TrackRecentlyViewed({
  slug,
  name,
  imageUrl,
  priceCents,
}: {
  slug: string;
  name: string;
  imageUrl: string;
  priceCents: number;
}) {
  useEffect(() => {
    if (!slug || !name) return;
    pushRecentlyViewed({ slug, name, imageUrl, priceCents });
  }, [slug, name, imageUrl, priceCents]);
  return null;
}

/**
 * "Only N left" low-stock badge. Shown below price when stock is low
 * but not zero. Includes subtle urgency copy.
 */
export function LowStockBadge({
  stock,
  threshold = 5,
  className = '',
}: {
  stock: number | null | undefined;
  threshold?: number;
  className?: string;
}) {
  // Avoid hydration mismatch — show only after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  if (stock === null || stock === undefined) return null;
  if (stock <= 0 || stock > threshold) return null;
  return (
    <div className={`mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200 ${className}`}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
      </span>
      Only {stock} left in stock
    </div>
  );
}
