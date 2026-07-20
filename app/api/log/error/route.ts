import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/log/error
 * Public. Captures client-side errors and stores them in public.error_log.
 * Tail latency, prune oldest 1000 rows beyond a 30-day window.
 *
 * Until you sign up for Sentry, this gives you an in-app error inbox
 * (Supabase Studio table "error_log") you can check whenever.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const admin = await createAdminClient();

  await (admin as any).from('error_log').insert({
    message: String(body.message ?? '').slice(0, 2000),
    stack: String(body.stack ?? '').slice(0, 4000),
    url: String(body.url ?? '').slice(0, 500),
    user_agent: String(body.user_agent ?? '').slice(0, 500),
    severity: ['fatal', 'error', 'warning', 'info'].includes(body.severity)
      ? body.severity
      : 'error',
    payload: body.payload ?? null,
    occurred_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
