'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatRand } from '@/lib/format';
import {
  getRecentSearches,
  pushRecentSearch,
  clearRecentSearches,
} from '@/lib/utils/recent-searches';

type ProductHit = {
  id: string;
  slug: string;
  name: string;
  base_price_cents: number;
  compare_at_cents: number | null;
  on_sale: boolean;
};

type CategoryHit = {
  id: string;
  slug: string;
  name: string;
};

type ApiResponse = {
  products: ProductHit[];
  categories: CategoryHit[];
  popular: CategoryHit[];
};

const EMPTY: ApiResponse = {
  products: [],
  categories: [],
  popular: [],
};

type Props = {
  className?: string;
  /** When true the input is full-width (used on mobile sheet). */
  variant?: 'compact' | 'wide';
};

/**
 * Premium search dropdown.
 *
 * Features:
 *  - Live autocomplete (250ms debounced fetch) via /api/search/autocomplete
 *  - Categories returned when matching, plus a curated popular list when input is empty
 *  - Recent searches (localStorage, max 6) shown on focus when query is empty
 *  - Keyboard nav (Up/Down to move, Enter to pick, Esc to close)
 *  - Click or Enter on the "View all results" row goes to /search?q=...
 *  - SSR-safe
 */
export function SearchAutocomplete({ className = '', variant = 'compact' }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ApiResponse>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isMobileSheet, setMobileSheet] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Flatten every clickable row for keyboard nav
  const flatRows = () => [
    ...data.categories.map((c) => ({ kind: 'category' as const, ...c })),
    ...data.products.map((p) => ({ kind: 'product' as const, ...p })),
  ];

  const fetchSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setData({ products: [], categories: [], popular: data.popular });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(q)}`, {
        cache: 'no-store',
      });
      const json = (await res.json()) as ApiResponse;
      setData({
        products: json.products ?? [],
        categories: json.categories ?? [],
        popular: json.popular ?? [],
      });
      setActiveIndex(-1);
    } catch {
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial popular load + recent list
  useEffect(() => {
    setRecent(getRecentSearches());
    fetch('');
  }, [fetch]);

  // Debounced typed search
  useEffect(() => {
    const t = setTimeout(() => fetchSearch(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query, fetchSearch]);

  // Click outside closes
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const goToSearchPage = (q: string) => {
    pushRecentSearch(q);
    setRecent(getRecentSearches());
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
    setMobileSheet(false);
    setQuery('');
  };

  const goToProduct = (slug: string, q: string) => {
    pushRecentSearch(q);
    setRecent(getRecentSearches());
    router.push(`/p/${slug}`);
    setOpen(false);
    setMobileSheet(false);
    setQuery('');
  };

  const goToCategory = (slug: string, q: string) => {
    pushRecentSearch(q);
    setRecent(getRecentSearches());
    router.push(`/c/${slug}`);
    setOpen(false);
    setMobileSheet(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const rows = flatRows();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(rows.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(-1, i - 1));
    } else if (e.key === 'Enter') {
      const trimmed = query.trim();
      if (activeIndex >= 0 && rows[activeIndex]) {
        e.preventDefault();
        const row = rows[activeIndex];
        if (row.kind === 'product') goToProduct(row.slug, trimmed || row.name);
        else goToCategory(row.slug, trimmed || row.name);
      } else if (trimmed.length >= 2) {
        e.preventDefault();
        goToSearchPage(trimmed);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const shouldShowDropdown =
    open && (loading || data.products.length > 0 || data.categories.length > 0 || (query.trim().length === 0 && recent.length > 0) || (query.trim().length === 0 && data.popular.length > 0));

  const showRecents = query.trim().length === 0 && recent.length > 0 && open;
  const showPopular = query.trim().length === 0 && open;
  const showResults = query.trim().length >= 2;
  const hasAnyResult = data.products.length + data.categories.length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Compact desktop input */}
      <input
        ref={inputRef}
        type="search"
        placeholder="Search products..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={
          variant === 'wide'
            ? 'w-full rounded-md border border-brand-300 bg-white px-3 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500'
            : 'hidden sm:block w-32 md:w-44 lg:w-56 rounded-md border border-brand-300 bg-white px-3 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500'
        }
        autoComplete="off"
        aria-label="Search products"
      />

      {/* Compact mobile FAB (kept identical to old SearchBar so Header layout doesn't shift) */}
      <button
        type="button"
        onClick={() => setMobileSheet(true)}
        className="sm:hidden rounded-md p-2 text-brand-700 hover:bg-brand-50"
        aria-label="Open search"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>

      {/* Desktop dropdown */}
      {shouldShowDropdown && !isMobileSheet && (
        <div className="absolute right-0 top-full mt-1 w-96 max-h-[70vh] overflow-y-auto rounded-lg border border-brand-200 bg-white shadow-xl z-50">
          {loading && (
            <div className="flex items-center gap-2 p-3 text-sm text-brand-500">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent-500" />
              Searching…
            </div>
          )}

          {/* Recents */}
          {showRecents && !loading && (
            <div className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-500">
                  Recent
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearRecentSearches();
                    setRecent([]);
                  }}
                  className="text-[10px] text-brand-500 hover:text-brand-800"
                >
                  Clear
                </button>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {recent.map((r) => (
                  <li key={r}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuery(r);
                        setOpen(true);
                      }}
                      className="rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-700 hover:bg-brand-100"
                    >
                      {r}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Popular categories (only when no query + no recents yet) */}
          {showPopular && !showRecents && !loading && data.popular.length > 0 && (
            <div className="p-3 border-b border-brand-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-500 mb-2">
                Popular categories
              </p>
              <ul className="grid grid-cols-2 gap-1.5">
                {data.popular.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToCategory(c.slug, c.name);
                      }}
                      className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-brand-700 hover:bg-brand-50"
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Categories */}
          {showResults && data.categories.length > 0 && (
            <div className="border-b border-brand-100 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-500 mb-2">
                Categories
              </p>
              <ul className="space-y-0.5">
                {data.categories.map((c, idx) => {
                  const globalIdx = idx;
                  const isActive = activeIndex === globalIdx;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToCategory(c.slug, query);
                        }}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                          isActive ? 'bg-brand-100 text-brand-900' : 'text-brand-700 hover:bg-brand-50'
                        }`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-500" aria-hidden="true">
                          <path d="M3 7V5a2 2 0 0 1 2-2h2M15 21a2 2 0 0 1-2 2v-2M21 15v2a2 2 0 0 1-2 2h-2M7 21a2 2 0 0 1-2-2v-2M3 15v-2M21 7v2M3 7h18M7 3v18" />
                        </svg>
                        <span className="truncate">{c.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Products */}
          {showResults && data.products.length > 0 && (
            <div className="p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-500 mb-2">
                Products
              </p>
              <ul className="space-y-0.5">
                {data.products.map((p, idx) => {
                  const globalIdx = data.categories.length + idx;
                  const isActive = activeIndex === globalIdx;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToProduct(p.slug, query);
                        }}
                        className={`flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm ${
                          isActive ? 'bg-brand-100' : 'hover:bg-brand-50'
                        }`}
                      >
                        <div className="h-10 w-10 flex-shrink-0 rounded bg-brand-100" />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 font-medium text-brand-900">{p.name}</p>
                          <p className="text-xs">
                            <span className="font-semibold text-brand-950">{formatRand(p.base_price_cents)}</span>
                            {p.on_sale && p.compare_at_cents && (
                              <span className="ml-1.5 text-brand-400 line-through">
                                {formatRand(p.compare_at_cents)}
                              </span>
                            )}
                          </p>
                        </div>
                        {p.on_sale && (
                          <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                            Sale
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Empty state */}
          {showResults && !loading && hasAnyResult === false && (
            <div className="p-6 text-center text-sm text-brand-500">
              <p>No matches for &ldquo;{query.trim()}&rdquo;</p>
              <p className="mt-1 text-xs">
                Try a different term or browse{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    router.push('/new');
                  }}
                  className="text-brand-700 underline hover:text-brand-900"
                >
                  new arrivals
                </button>
                .
              </p>
            </div>
          )}

          {/* View all results */}
          {showResults && query.trim().length >= 2 && (
            <div className="border-t border-brand-100 p-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToSearchPage(query);
                }}
                className="block w-full rounded-md bg-brand-50 px-3 py-2 text-center text-sm font-medium text-brand-800 hover:bg-brand-100"
              >
                View all results for &ldquo;{query.trim()}&rdquo; →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mobile sheet — quick port; same data flow, larger targets */}
      {isMobileSheet && (
        <div className="fixed inset-0 z-50 sm:hidden flex flex-col bg-white">
          <div className="flex items-center gap-2 border-b border-brand-200 p-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-500 flex-shrink-0" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              autoFocus
              type="search"
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              className="flex-1 outline-none text-base bg-transparent"
            />
            <button type="button" onClick={() => { setMobileSheet(false); setQuery(''); }} className="text-sm text-brand-600 px-2">
              Cancel
            </button>
          </div>
          <div className="overflow-y-auto">
            {showRecents && (
              <div className="border-b border-brand-100 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-500">Recent</p>
                  <button
                    type="button"
                    onClick={() => { clearRecentSearches(); setRecent([]); }}
                    className="text-[10px] text-brand-500 hover:text-brand-800"
                  >Clear</button>
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {recent.map((r) => (
                    <li key={r}>
                      <button
                        type="button"
                        onClick={() => setQuery(r)}
                        className="rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-700 hover:bg-brand-100"
                      >{r}</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {query.trim().length === 0 && !showRecents && data.popular.length > 0 && (
              <ul className="divide-y divide-brand-100">
                {data.popular.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => { goToCategory(c.slug, c.name); }}
                      className="block w-full px-4 py-3 text-left text-sm text-brand-700 hover:bg-brand-50"
                    >
                      Browse {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {showResults && data.categories.length > 0 && (
              <div className="border-t border-brand-100 p-2">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-500">Categories</p>
                {data.categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => goToCategory(c.slug, query)}
                    className="block w-full rounded px-3 py-2 text-left text-sm text-brand-700 hover:bg-brand-50"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            {showResults && data.products.length > 0 && (
              <ul className="divide-y divide-brand-100">
                {data.products.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => goToProduct(p.slug, query)}
                      className="flex items-center gap-3 w-full p-3 text-left hover:bg-brand-50"
                    >
                      <div className="h-12 w-12 flex-shrink-0 rounded bg-brand-100" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brand-900 line-clamp-1">{p.name}</p>
                        <p className="text-xs">
                          <span className="font-semibold text-brand-950">{formatRand(p.base_price_cents)}</span>
                          {p.on_sale && p.compare_at_cents && (
                            <span className="ml-1.5 text-brand-400 line-through">{formatRand(p.compare_at_cents)}</span>
                          )}
                        </p>
                      </div>
                      {p.on_sale && (
                        <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold uppercase text-white">Sale</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {showResults && !loading && !hasAnyResult && (
              <p className="p-6 text-center text-sm text-brand-500">
                No products match &ldquo;{query.trim()}&rdquo;.
              </p>
            )}
            {showResults && query.trim().length >= 2 && (
              <div className="border-t border-brand-100 p-3">
                <button
                  type="button"
                  onClick={() => goToSearchPage(query)}
                  className="block w-full rounded-md bg-brand-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-800"
                >
                  View all results for &ldquo;{query.trim()}&rdquo; →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
