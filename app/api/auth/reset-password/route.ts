import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/reset-password
 * Body: { accessToken, refreshToken, newPassword }
 *
 * Sets a new password using a Supabase session token from the email link.
 * Returns a new access/refresh token pair so the client can sign the user in.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { accessToken, refreshToken, newPassword } = body ?? {};
  if (!accessToken || !refreshToken || !newPassword) {
    return NextResponse.json({ error: 'Missing tokens' }, { status: 400 });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return NextResponse.json({ error: 'Password too short (min 8)' }, { status: 400 });
  }

  const supabase = await createClient();

  // Establish a session from the link tokens
  const { error: setSessionErr } = await (supabase as any).auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (setSessionErr) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });
  }

  // Update password for the now-authenticated user
  const { error: updateErr } = await (supabase as any).auth.updateUser({
    password: newPassword,
  });
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
