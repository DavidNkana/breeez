import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthCallbackUrl } from '@/lib/auth/redirect';

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 *
 * Triggers Supabase's built-in password reset email.
 * Always returns ok (enumeration-safe) — Supabase hides whether the email exists.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (typeof body?.email !== 'string') {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }
  const email = body.email.trim();

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const supabase = await createClient();
  // Always 200, even if email isn't registered
  await (supabase as any).auth.resetPasswordForEmail(email, {
    emailRedirectTo: getAuthCallbackUrl('/auth/reset-password', req.headers.get('x-client-origin') ?? new URL(req.url).origin),
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
