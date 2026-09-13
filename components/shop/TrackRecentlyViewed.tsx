'use client';

import { useEffect } from 'react';
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
