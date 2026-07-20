'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { logError } from '@/lib/utils/error-logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[app error boundary]', error);
    logError({
      message: error?.message ?? 'Unknown error',
      stack: error?.stack,
      severity: 'error',
      extra: { digest: error?.digest ?? null },
    });
  }, [error]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-4 py-16 pb-20 safe-bottom text-center">
        <p className="text-5xl">⚠️</p>
        <h1 className="mt-3 text-2xl font-semibold text-brand-950">Something went wrong</h1>
        <p className="mt-2 text-sm text-brand-700">
          We&apos;ve been notified. Please try again, or head back home.
        </p>
        {error.digest && (
          <p className="mt-2 text-[10px] text-brand-400 font-mono">
            Error reference: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-md border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50"
          >
            Go home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
