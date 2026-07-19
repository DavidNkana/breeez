'use client';

import Link from 'next/link';

/**
 * Sticky mini-header used by legal/info pages.
 * Has the Breeez logo (links home), a back button, and the page title.
 * Server-friendly so it can be rendered anywhere.
 */
export function InfoHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-brand-200 bg-white safe-top">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-brand-900 hover:text-accent-600 transition-colors"
          aria-label="Back to home"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand-900 text-white font-bold text-base">
            B
          </span>
          <span className="font-semibold text-base hidden sm:inline">Breeez</span>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-brand-900 truncate">{title}</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-md border border-brand-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Home
        </Link>
      </div>
    </header>
  );
}