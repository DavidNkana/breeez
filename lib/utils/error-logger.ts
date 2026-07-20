/**
 * Fire-and-forget error logger. Posts to /api/log/error which writes
 * to public.error_log (Supabase). Stand-in for Sentry until you wire
 * up a real sentry.io DSN.
 */
export async function logError(payload: {
  message: string;
  stack?: string;
  severity?: 'fatal' | 'error' | 'warning' | 'info';
  url?: string;
  userAgent?: string;
  extra?: Record<string, unknown>;
}) {
  if (typeof window === 'undefined') return;
  try {
    fetch('/api/log/error', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: payload.message,
        stack: payload.stack,
        severity: payload.severity ?? 'error',
        url: payload.url ?? window.location.href,
        user_agent: payload.userAgent ?? navigator.userAgent,
        payload: payload.extra ?? null,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never let logging break the app
  }
}
