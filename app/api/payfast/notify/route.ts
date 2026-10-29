import { NextResponse } from 'next/server';
import { handlePayFastNotify } from '@/lib/payments/payfast-notify';

export const runtime = 'nodejs';

/**
 * PayFast ITN endpoint — the canonical public path.
 *
 * This is the URL to paste into the PayFast dashboard under
 * Developer Settings → Instant Transaction Notification:
 *
 *   https://www.evasale.co.za/api/payfast/notify
 *
 * `/api/webhooks/payfast` remains available and behaves identically — both
 * routes delegate to one shared handler.
 */
export async function POST(request: Request) {
  return handlePayFastNotify(request);
}

export async function GET() {
  return NextResponse.json({ error: 'PayFast notifications require POST' }, { status: 405 });
}
