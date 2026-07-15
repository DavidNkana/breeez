'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/lib/utils/use-debounce';

type SearchResult = {
  id: string;
  slug: string;
  name: string;
  base_price_cents: number;
  image_url: string | null;
};

const NAV_LINKS = [
  { href: '/c/apparel', label: 'Apparel' },
  { href: '/c/kitchen', label: 'Kitchen' },
  { href: '/c/home-decor', label: 'Home Decor' },
  { href: '/c/back-to-school', label: 'Back to School' },
  { href: '/c/bathroom', label: 'Bathroom' },
  { href: '/c/bedroom', label: 'Bedroom' }
];

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 250);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => setResults(data.results || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Compact search trigger (sm and up shows input) */}
      <div className="hidden sm:block">
        <input
          type="search"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          className="w-32 md:w-44 lg:w-56 rounded-md border border-brand-300 bg-white px-3 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          aria-label="Search products"
        />
      </div>

      {/* Mobile search icon button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="sm:hidden rounded-md p-2 text-brand-700 hover:bg-brand-50"
        aria-label="Open search"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>

      {/* Desktop dropdown */}
      {open && query.length >= 2 && (
        <div className="absolute right-0 top-full mt-1 w-80 max-h-96 overflow-y-auto rounded-md border border-brand-200 bg-white shadow-lg z-50">
          {loading && <div className="p-3 text-sm text-brand-500">Searching...</div>}
          {!loading && results.length === 0 && debouncedQuery.length >= 2 && (
            <div className="p-3 text-sm text-brand-500">No products found</div>
          )}
          {results.length > 0 && (
            <ul>
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => { router.push(`/p/${r.slug}`); setOpen(false); setQuery(''); }}
                    className="flex items-center gap-3 w-full p-2 text-left hover:bg-brand-50"
                  >
                    {r.image_url ? (
                      <img src={r.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-brand-100" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-900 line-clamp-1">{r.name}</p>
                      <p className="text-xs text-brand-500">R{(r.base_price_cents / 100).toFixed(2)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Mobile search sheet */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 sm:hidden bg-white" role="dialog" aria-label="Search">
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
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              className="flex-1 outline-none text-base"
            />
            <button type="button" onClick={() => { setMobileOpen(false); setQuery(''); }} className="text-sm text-brand-600 px-2">
              Cancel
            </button>
          </div>
          {query.length >= 2 && (
            <div className="overflow-y-auto">
              {loading && <div className="p-4 text-sm text-brand-500 text-center">Searching...</div>}
              {!loading && results.length === 0 && <div className="p-4 text-sm text-brand-500 text-center">No products found</div>}
              {results.length > 0 && (
                <ul className="divide-y divide-brand-100">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => { router.push(`/p/${r.slug}`); setMobileOpen(false); setQuery(''); }}
                        className="flex items-center gap-3 w-full p-3 text-left hover:bg-brand-50"
                      >
                        {r.image_url ? (
                          <img src={r.image_url} alt="" className="h-12 w-12 rounded object-cover" />
                        ) : (
                          <div className="h-12 w-12 rounded bg-brand-100" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-brand-900 line-clamp-1">{r.name}</p>
                          <p className="text-xs text-brand-500">R{(r.base_price_cents / 100).toFixed(2)}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {/* Show nav links when no query */}
          {query.length < 2 && (
            <ul className="divide-y divide-brand-100">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-sm text-brand-700 hover:bg-brand-50">
                    Browse {l.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}