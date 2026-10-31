'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { loadOrderReceipt, type OrderReceiptData } from '@/lib/orders/receipt';

export type TrackState = {
  ok: boolean;
  error?: string;
  receipt?: OrderReceiptData;
};

/**
 * Look up an order with the order number and the email used at checkout.
 *
 * Both are required: order numbers are sequential, so the email is what
 * proves the order belongs to the person asking.
 *
 * This is a POST server action on purpose — the customer's email address
 * stays in the request body instead of ending up in the URL (and in browser
 * history, bookmarks and server access logs).
 */
export async function trackOrder(_prev: TrackState, formData: FormData): Promise<TrackState> {
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
    .select('id')
    .eq('order_number', orderNumber)
    .ilike('email', email)
    .maybeSingle()) as any;

  if (!data) {
    return {
      ok: false,
      error: 'We could not find an order with that number and email. Check the details and try again.',
    };
  }

  const receipt = await loadOrderReceipt(data.id);
  if (!receipt) return { ok: false, error: 'We could not load that order. Please contact support.' };

  return { ok: true, receipt };
}
