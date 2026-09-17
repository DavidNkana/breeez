'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { logError } from '@/lib/utils/error-logger';

/**
 * Error boundary specifically for /admin/orders.
 *
 * In production Next.js sanitizes error.message to avoid leaking server
 * details to the client, so this boundary:
 *   - displays the digest (which IS preserved)
 *   - logs the FULL error to /api/log/error → public.error_log table
 *   - tells the user how to read the actual error from Supabase
 *
 * To see the real stack trace: Supabase Studio → SQL Editor → run:
 *   select digest, message, stack, occurred_at
 *   from public.error_log order by occurred_at desc limit 5;
 */
export default function AdminOrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError({
      message: `[admin/orders] page error: ${error?.message ?? 'Unknown'}`,
      stack: error?.stack ?? '',
      severity: 'error',
      extra: {
        digest: typeof error?.digest === 'string' ? error.digest : '',
        source: 'app/admin/orders/error.tsx',
      },
    });
    // eslint-disable-next-line no-console
    console.error('[admin/orders] error boundary caught:', error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl min-w-0 overflow-x-hidden px-4 py-16 pb-20 safe-bottom">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/40">
        <p className="text-3xl">⚠️</p>
        <h1 className="mt-2 text-xl font-semibold text-red-900 dark:text-red-300">
          Orders page failed to load
        </h1>
        <p className="mt-2 text-sm text-red-700 dark:text-red-400">
          An error occurred while loading the orders page. The full stack
          trace has been logged.
        </p>

        <div className="mt-4 rounded border border-red-300 bg-white p-3 dark:border-red-700 dark:bg-red-900/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
            Error reference
          </p>
          <p className="mt-1 break-all font-mono text-xs text-red-900 dark:text-red-200">
            {error?.digest ?? 'unknown'}
          </p>
          {error?.message && (
            <>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
                Message (sanitized in production)
              </p>
              <p className="mt-1 break-all font-mono text-xs text-red-900 dark:text-red-200">
                {error.message}
              </p>
            </>
          )}
        </div>

        <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/40">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-300">
            See the real error
          </p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-400">
            Run this in Supabase Studio → SQL Editor:
          </p>
          <pre className="mt-1 overflow-x-auto rounded bg-amber-100 p-2 text-[10px] font-mono text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
{`select digest, message, stack, occurred_at
from public.error_log
where payload->>'source' = 'app/admin/orders/error.tsx'
order by occurred_at desc
limit 5;`}
          </pre>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-600 active:bg-accent-700"
          >
            Try again
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center rounded-md border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50 dark:border-brand-600 dark:bg-brand-900 dark:text-white dark:hover:bg-brand-800"
          >
            Back to admin
          </Link>
        </div>
      </div>
    </main>
  );
}
