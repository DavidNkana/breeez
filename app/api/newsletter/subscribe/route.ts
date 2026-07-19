import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendNewsletterWelcome } from '@/lib/email/resend';

/**
 * POST /api/newsletter/subscribe
 * Body: { email, marketing_opt_in?: boolean }
 *
 * Inserts the email into public.newsletter_subscribers.
 * Sends a welcome email via Resend if configured; otherwise silently succeeds.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email: string = (body?.email ?? '').trim().toLowerCase();

  if (!email || !email.includes('@') || email.length > 254) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const admin = await createAdminClient();

  // Upsert: if email already exists, do nothing (idempotent)
  const { error } = await (admin as any)
    .from('newsletter_subscribers')
    .upsert(
      { email, source: 'footer' },
      { onConflict: 'email', ignoreDuplicates: true }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire-and-forget welcome email
  sendNewsletterWelcome({ to: email }).catch(() => {});

  return NextResponse.json({ ok: true });
}
