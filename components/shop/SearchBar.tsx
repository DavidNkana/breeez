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

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
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
      <input
        type="search"
        placeholder="Search products..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        className="w-32 sm:w-48 rounded-md border border-brand-300 bg-white px-3 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        aria-label="Search products"
      />
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
    </div>
  );
}