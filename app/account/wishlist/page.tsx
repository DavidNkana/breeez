'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { EmptyState } from '@/components/ui/EmptyState';
import { useWishlist, type WishlistItem } from '@/lib/wishlist/store';
import { formatRand } from '@/lib/format';

export default function WishlistPage() {
  // Hydration-safe: only show items after mount (Zustand persist hydrates from localStorage)
  const [hydrated, setHydrated] = useState(false);
  const items = useWishlist((s) => s.items);
  const remove = useWishlist((s) => s.remove);

  useEffect(() => { setHydrated(true); }, []);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">My wishlist</h1>
        <p className="mt-1 text-sm text-brand-600">
          {hydrated && items.length > 0
            ? `${items.length} item${items.length === 1 ? '' : 's'} saved`
            : 'Items you saved for later.'}
        </p>

        <div className="mt-6">
          {!hydrated ? (
            <p className="text-sm text-brand-500">Loading…</p>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((it: WishlistItem) => (
                <div key={it.variantId} className="group relative rounded-lg border border-brand-200 bg-white p-3 hover:border-brand-400">
                  <Link href={`/p/${it.productSlug}`} className="block">
                    {it.imageUrl ? (
                      <div className="aspect-square overflow-hidden rounded bg-brand-100 mb-2">
                        <img src={it.imageUrl} alt={it.name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="aspect-square rounded bg-brand-100 mb-2" />
                    )}
                    <p className="text-sm font-medium text-brand-900 line-clamp-1">{it.name}</p>
                    <p className="mt-0.5 text-sm font-semibold text-brand-950">{formatRand(it.priceCents)}</p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(it.variantId)}
                    className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-danger opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
                    aria-label="Remove from wishlist"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M6 6l12 12M6 18L18 6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Your wishlist is empty"
              description="Tap the heart on any product to save it for later."
              action={{ label: 'Browse products', href: '/' }}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}