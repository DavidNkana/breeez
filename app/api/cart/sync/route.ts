import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';

/**
 * Sync local cart to Supabase.
 * If user is logged in, cart is attached to their customer_id.
 * If anonymous, cart uses a session_id stored in a cookie.
 */
export async function POST(req: Request) {
  const { items } = await req.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No items' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  let sessionId = cookieStore.get('breeez_cart_session')?.value;
  if (!sessionId) {
    sessionId = randomUUID();
    cookieStore.set('breeez_cart_session', sessionId, { maxAge: 60 * 60 * 24 * 30, path: '/' });
  }

  // Cast admin to any to avoid Supabase typed-client friction with our hand-written Database
  const admin: any = createAdminClient();

  // Find or create cart
  let cartId: string;
  if (user) {
    const { data: existing } = await admin
      .from('carts')
      .select('id')
      .eq('customer_id', user.id)
      .maybeSingle();
    if (existing && (existing as any).id) {
      cartId = (existing as any).id;
    } else {
      const { data: created } = await admin
        .from('carts')
        .insert({ customer_id: user.id })
        .select('id')
        .single();
      cartId = (created as any)!.id;
    }
    // Migrate anonymous cart if exists
    if (sessionId) {
      const { data: anonCart } = await admin
        .from('carts')
        .select('id')
        .eq('session_id', sessionId)
        .maybeSingle();
      if (anonCart && (anonCart as any).id !== cartId) {
        // Move items from anonymous cart to user cart
        await admin.from('cart_items').update({ cart_id: cartId }).eq('cart_id', (anonCart as any).id);
        await admin.from('carts').delete().eq('id', (anonCart as any).id);
      }
    }
  } else {
    const { data: existing } = await admin
      .from('carts')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (existing && (existing as any).id) {
      cartId = (existing as any).id;
    } else {
      const { data: created } = await admin
        .from('carts')
        .insert({ session_id: sessionId })
        .select('id')
        .single();
      cartId = (created as any)!.id;
    }
  }

  // Clear and re-insert items
  await admin.from('cart_items').delete().eq('cart_id', cartId);
  await admin.from('cart_items').insert(
    items.map((it: any) => ({
      cart_id: cartId,
      variant_id: it.variantId,
      quantity: it.quantity
    })) as any
  );

  return NextResponse.json({ cartId });
}