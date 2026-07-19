import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/session';

/**
 * Address CRUD.
 * GET  /api/addresses           — list current user's addresses
 * POST /api/addresses           — create
 * PATCH /api/addresses          — update
 * DELETE /api/addresses?id=...  — delete
 */

function validate(body: any): { ok: true; data: any } | { ok: false; error: string } {
  const label = (body?.label ?? '').trim() || 'Home';
  const line1 = (body?.line1 ?? '').trim();
  const city = (body?.city ?? '').trim();
  const province = (body?.province ?? '').trim();
  const postal_code = (body?.postal_code ?? '').trim();
  const line2 = (body?.line2 ?? '').trim() || null;
  const is_default = !!body?.is_default;

  if (!line1) return { ok: false, error: 'Address line 1 is required' };
  if (!city) return { ok: false, error: 'City is required' };
  if (!province) return { ok: false, error: 'Province is required' };
  if (!postal_code) return { ok: false, error: 'Postal code is required' };

  return { ok: true, data: { label, line1, line2, city, province, postal_code, is_default } };
}

export async function GET() {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json([], { status: 401 }); }
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('addresses')
    .select('*')
    .eq('customer_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const body = await req.json().catch(() => null);
  const v = validate(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const supabase = await createClient();

  // If this is set as default, clear other defaults first
  if (v.data.is_default) {
    await (supabase as any)
      .from('addresses')
      .update({ is_default: false })
      .eq('customer_id', user.id);
  }

  const { data, error } = await (supabase as any)
    .from('addresses')
    .insert({ ...v.data, customer_id: user.id })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const body = await req.json().catch(() => null);
  const id = body?.id;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const v = validate(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const supabase = await createClient();

  if (v.data.is_default) {
    await (supabase as any)
      .from('addresses')
      .update({ is_default: false })
      .eq('customer_id', user.id)
      .neq('id', id);
  }

  const { data, error } = await (supabase as any)
    .from('addresses')
    .update(v.data)
    .eq('id', id)
    .eq('customer_id', user.id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from('addresses')
    .delete()
    .eq('id', id)
    .eq('customer_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
