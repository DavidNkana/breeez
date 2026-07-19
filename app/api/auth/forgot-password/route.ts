import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/forgot-password
 * Body: { email, redirectTo? }
 *
 * Triggers Supabase's built-in password reset email.
 * Always returns ok (enumeration-safe) — Supabase hides whether the email exists.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email: string = (body?.email ?? '').trim();
  const redirectTo: string = (body?.redirectTo ?? '').trim();

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const supabase = await createClient();
  // Always 200, even if email isn't registered
  await (supabase as any).auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || undefined,
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
