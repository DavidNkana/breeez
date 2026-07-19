import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/coupon/validate
 * Body: { code, subtotalCents }
 * Public (any logged-in or guest customer can validate at checkout).
 *
 * Returns:
 *   { valid: true, code, kind, value, discountCents }
 *   { valid: false, reason: string }
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false, reason: 'Invalid request' }, { status: 400 });
  }

  const rawCode: string = (body?.code ?? '').trim().toUpperCase();
  const subtotalCents: number = parseInt(body?.subtotalCents ?? '0', 10);

  if (!rawCode) {
    return NextResponse.json({ valid: false, reason: 'Enter a code' }, { status: 400 });
  }
  if (!Number.isFinite(subtotalCents) || subtotalCents < 0) {
    return NextResponse.json({ valid: false, reason: 'Invalid cart' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: row, error } = await (supabase as any)
    .from('discount_codes')
    .select('*')
    .eq('code', rawCode)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ valid: false, reason: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ valid: false, reason: 'Code not found' });
  }

  const now = new Date();
  if (row.starts_at && new Date(row.starts_at) > now) {
    return NextResponse.json({ valid: false, reason: 'Code is not yet active' });
  }
  if (row.expires_at && new Date(row.expires_at) < now) {
    return NextResponse.json({ valid: false, reason: 'Code has expired' });
  }
  if (row.max_uses !== null && row.used_count >= row.max_uses) {
    return NextResponse.json({ valid: false, reason: 'Code fully used' });
  }
  if (subtotalCents < row.min_order_cents) {
    return NextResponse.json({
      valid: false,
      reason: `Minimum order ${formatCents(row.min_order_cents)} required`,
    });
  }

  let discountCents = 0;
  if (row.kind === 'percent') {
    discountCents = Math.round((subtotalCents * row.value) / 100);
  } else if (row.kind === 'fixed_amount') {
    discountCents = Math.min(subtotalCents, row.value);
  }

  return NextResponse.json({
    valid: true,
    code: row.code,
    kind: row.kind,
    value: row.value,
    description: row.description,
    discountCents,
  });
}

function formatCents(cents: number): string {
  return `R ${(cents / 100).toFixed(2)}`;
}
