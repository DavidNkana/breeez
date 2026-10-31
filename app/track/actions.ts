'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { loadOrderReceipt } from '@/lib/orders/receipt';

export type TrackResult = {
  ok: boolean;
  error?: string;
  orderId?: string;
  orderNumber?: string;
};

/**
 * Look up an order with the order number and the email used at checkout.
 *
 * Both are required: order numbers are sequential, so the email is what
 * proves the order belongs to the person asking.
 */
export async function trackOrder(formData: FormData): Promise<TrackResult> {
  const orderNumber = String(formData.get('order_number') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();

  if (!orderNumber || !email) {
    return { ok: false, error: 'Enter your order number and the email you used at checkout.' };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: 'That email address does not look right.' };
  }

  const admin = await createAdminClient();
  const { data } = (await admin
    .from('orders')
    .select('id, order_number, email')
    .eq('order_number', orderNumber)
    .ilike('email', email)
    .maybeSingle()) as any;

  if (!data) {
    return {
      ok: false,
      error: 'We could not find an order with that number and email. Check the details and try again.',
    };
  }

  return { ok: true, orderId: data.id, orderNumber: data.order_number };
}
