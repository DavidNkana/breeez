import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/session';
import { isBuildingType } from '@/lib/delivery/buildings';

/**
 * GET  /api/account/addresses — the customer's saved delivery locations.
 * POST /api/account/addresses — save a location for next time.
 *
 * The customer chooses "save this location" at checkout. We keep the building
 * type, the name of the place and a contact number with it, because a saved
 * address that a courier cannot use is worse than no saved address.
 */
export async function GET() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = (await supabase
    .from('addresses')
    .select('*')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })) as any;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ addresses: data ?? [] });
}

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const line1 = String(body.line1 ?? '').trim();
  const city = String(body.city ?? '').trim();
  const postalCode = String(body.postalCode ?? body.postal_code ?? '').trim();
  if (!line1 || !city || !postalCode) {
    return NextResponse.json({ error: 'Street, city and postal code are required' }, { status: 400 });
  }

  const buildingType = isBuildingType(body.buildingType) ? body.buildingType : null;

  const supabase = await createClient();
  const { data, error } = (await supabase
    .from('addresses')
    .insert({
      customer_id: user.id,
      label: String(body.label ?? 'Home').trim().slice(0, 40) || 'Home',
      line1,
      line2: String(body.line2 ?? '').trim() || null,
      city,
      province: String(body.province ?? 'Gauteng').trim(),
      postal_code: postalCode,
      building_type: buildingType,
      building_name: String(body.buildingName ?? '').trim() || null,
      phone: String(body.phone ?? '').trim() || null,
      delivery_instructions: String(body.deliveryInstructions ?? '').trim() || null,
      is_default: false,
    } as any)
    .select('*')
    .single()) as any;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ address: data });
}
