'use client';

import { useEffect, useState } from 'react';

const KEY = 'breeez:recently_viewed';
const MAX = 10;

export type RecentProduct = {
  slug: string;
  name: string;
  imageUrl: string;
  priceCents: number;
};

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getRecentlyViewed(): RecentProduct[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const items = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(items)) return [];
    return items.filter((x): x is RecentProduct =>
      typeof x === 'object' && x !== null &&
      typeof (x as any).slug === 'string' &&
      typeof (x as any).name === 'string' &&
      typeof (x as any).imageUrl === 'string' &&
      typeof (x as any).priceCents === 'number'
    ).slice(0, MAX);
  } catch {
    return [];
  }
}

export function pushRecentlyViewed(item: RecentProduct) {
  if (!isBrowser()) return;
  try {
    const existing = getRecentlyViewed().filter((p) => p.slug !== item.slug);
    const next = [item, ...existing].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore quota / permission errors
  }
}

export function clearRecentlyViewed() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/**
 * Hook for client components: returns the current recently-viewed list
 * and a `mounted` boolean so the SSR render can show a placeholder.
 */
export function useRecentlyViewed(): { items: RecentProduct[]; mounted: boolean } {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<RecentProduct[]>([]);

  useEffect(() => {
    setMounted(true);
    setItems(getRecentlyViewed());
    function refresh() { setItems(getRecentlyViewed()); }
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  return { items, mounted };
}
