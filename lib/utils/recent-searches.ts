'use client';

/**
 * localStorage-backed recent search history.
 *  - Max 6 entries
 *  - Dedupes (case-insensitive)
 *  - SSR safe
 */

const KEY = 'breeez:recent_searches';
const MAX = 6;

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getRecentSearches(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const items = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(items)) return [];
    return items.filter((x): x is string => typeof x === 'string').slice(0, MAX);
  } catch {
    return [];
  }
}

export function pushRecentSearch(query: string) {
  const cleaned = query.trim();
  if (!cleaned || cleaned.length < 2) return;
  if (!isBrowser()) return;
  try {
    const existing = getRecentSearches().filter(
      (q) => q.toLowerCase() !== cleaned.toLowerCase()
    );
    const next = [cleaned, ...existing].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore quota / permission errors
  }
}

export function clearRecentSearches() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
