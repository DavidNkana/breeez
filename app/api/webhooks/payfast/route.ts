import { NextResponse } from 'next/server';
import { handlePayFastNotify } from '@/lib/payments/payfast-notify';

export const runtime = 'nodejs';

/**
 * Alias of /api/payfast/notify — kept so an ITN URL configured before the
 * canonical path existed keeps working. Both routes share one handler.
 */
export async function POST(request: Request) {
  return handlePayFastNotify(request);
}

export async function GET() {
  return NextResponse.json({ error: 'PayFast notifications require POST' }, { status: 405 });
}
