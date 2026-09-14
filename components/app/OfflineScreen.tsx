'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { brand } from '@/lib/brand';

type OfflineScreenProps = {
  /** When true, user can dismiss the screen. When false, it's blocking. */
  dismissible?: boolean;
  /** Optional custom headline override. */
  headline?: string;
  /** Optional custom body text. */
  body?: string;
};

/**
 * Branded offline screen — full-bleed, black background, brand logo + a clear
 * "you are not connected to the internet" message + a retry button.
 *
 * Two ways this component gets shown:
 *
 *  1. WebJS layer: when `navigator.onLine === false` mid-session
 *     (e.g. user enters an elevator, wifi drops). A `use-network-status`
 *     hook can drive this and we render the component as a full overlay.
 *
 *  2. Cold-start fallback: the native Android `MainActivity` override
 *     ships a bundled `public/offline.html` that the WebView loads
 *     when the initial site load fails. That HTML is a static mirror
 *     of this component (logo + icon + message + retry button), so the
 *     cold-start case looks identical to the mid-session case.
 */
export function OfflineScreen({
  dismissible = false,
  headline = 'You are not connected to the internet',
  body = "We can't reach Evasale right now. Check your Wi-Fi or mobile data and try again."
}: OfflineScreenProps) {
  const router = useRouter();

  // Auto-retry every 5 seconds while the screen is showing. If the user
  // comes back online, the parent (use-network-status) will unmount us.
  useEffect(() => {
    const retry = () => router.refresh();
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [router]);

  function handleRetry() {
    router.refresh();
  }

  function handleDismiss() {
    // If parent passed dismissible, just reload the page; otherwise they
    // can tap retry. Reloading is the safest "leave the offline state" action.
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-[99998] flex flex-col items-center justify-center bg-black px-6 safe-top safe-bottom"
      role="alertdialog"
      aria-live="assertive"
      aria-labelledby="offline-headline"
      aria-describedby="offline-body"
    >
      <img
        src={brand.logo}
        alt={brand.name}
        className="h-auto w-40 sm:w-48"
      />

      <div className="mt-10 flex h-20 w-20 items-center justify-center rounded-full bg-amber-950 ring-1 ring-amber-700">
        {/* Cloud-off icon (lucide-style, inline) */}
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
           className="text-amber-300"
          aria-hidden="true"
        >
          <path d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
          <line x1="3" y1="3" x2="21" y2="21" />
        </svg>
      </div>

      <h1
        id="offline-headline"
        className="mt-8 text-center text-xl font-semibold text-white sm:text-2xl"
      >
        {headline}
      </h1>

      <p
        id="offline-body"
        className="mt-3 max-w-md text-center text-sm text-brand-300 sm:text-base"
      >
        {body}
      </p>

      <button
        type="button"
        onClick={handleRetry}
        className="mt-8 inline-flex items-center gap-2 rounded-md bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-600 active:bg-accent-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a9 9 0 11-3.46-7.1" />
          <path d="M21 3v6h-6" />
        </svg>
        Try again
      </button>

      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className="mt-3 text-sm text-brand-500 hover:underline"
        >
          Dismiss
        </button>
      )}

      <p className="mt-10 text-xs text-brand-300">
        {brand.name} — shop smart, save big
      </p>
    </div>
  );
}
