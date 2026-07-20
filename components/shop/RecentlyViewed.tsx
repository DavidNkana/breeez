'use client';

import Link from 'next/link';
import { formatRand } from '@/lib/format';
import { useRecentlyViewed } from '@/lib/utils/recently-viewed';

type Props = {
  /** Pass the *current* product so it isn't shown in the "also viewed" list. */
  currentSlug?: string;
  heading?: string;
};

/**
 * "You recently viewed" — slim horizontal strip that picks up where the
 * user left off. SSR-safe (renders nothing until mounted on the client).
 */
export function RecentlyViewed({ currentSlug, heading = 'Recently viewed' }: Props) {
  const { items, mounted } = useRecentlyViewed();
  if (!mounted) return null;
  const filtered = items.filter((p) => p.slug !== currentSlug);
  if (filtered.length === 0) return null;

  return (
    <section className="mt-10 border-t border-brand-200 pt-6">
      <h2 className="text-base font-semibold text-brand-950">{heading}</h2>
      <ul className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {filtered.map((p) => (
          <li key={p.slug} className="flex-shrink-0">
            <Link
              href={`/p/${p.slug}`}
              className="block w-32 group"
            >
              <div className="aspect-square overflow-hidden rounded-md bg-brand-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl || '/placeholder.svg'}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-brand-700">{p.name}</p>
              <p className="mt-0.5 text-xs font-semibold text-brand-950">{formatRand(p.priceCents)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
