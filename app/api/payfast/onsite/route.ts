import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/session';
import { verifyOrderAccess, signOrderAccess } from '@/lib/orders/access';
import { getPayFastAppOrigin } from '@/lib/payments/payfast';
import { createOnsitePayment, payFastOnsiteEngineUrl } from '@/lib/payments/payfast-onsite';
import { normaliseCellNumber } from '@/lib/payments/payfast';

/**
 * POST /api/payfast/onsite
 * Body: { orderId, email?, token? }
 *
 * Creates a Payfast "Onsite Payments" identifier for an existing pending
 * order. The client then renders Payfast's payment modal inside our own
 * checkout page — no redirect, so the customer never leaves the app.
 *
 * If Onsite is not enabled on the merchant account this returns a clear
 * error and the client falls back to the hosted checkout.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const orderId = String(body?.orderId ?? '').trim();
  const email = String(body?.email ?? '').trim();
  const token = String(body?.token ?? '').trim();
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  if (!merchantId || !merchantKey || !passphrase) {
    return NextResponse.json({ error: 'PayFast credentials not configured' }, { status: 503 });
  }

  const admin = await createAdminClient();
  const { data: order } = (await admin
    .from('orders')
    .select('id, order_number, email, status, total_cents, customer_id, shipping_address')
    .eq('id', orderId)
    .maybeSingle()) as any;
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  // The order must be the caller's and still awaiting payment.
  const authorised =
    verifyOrderAccess(order.id, order.email, token) ||
    (await getCurrentUser().catch(() => null))?.id === order.customer_id;
  if (!authorised) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  if (order.status !== 'pending_payment') {
    return NextResponse.json({ error: 'This order is no longer awaiting payment' }, { status: 409 });
  }

  const sandbox = process.env.PAYFAST_SANDBOX === 'true';
  const appOrigin = getPayFastAppOrigin();
  const address = order.shipping_address ?? {};

  const result = await createOnsitePayment({
    merchantId,
    merchantKey,
    passphrase,
    sandbox,
    orderId: order.id,
    orderNumber: order.order_number,
    amountCents: order.total_cents ?? 0,
    customerEmail: email || order.email,
    customerPhone: normaliseCellNumber(address.phone ?? ''),
    customerName: address.name ?? '',
    returnUrl: `${appOrigin}/checkout/success/${order.id}?ref=${order.order_number}&token=${signOrderAccess(order.id, order.email)}`,
    cancelUrl: `${appOrigin}/checkout/cancelled/${order.id}?ref=${order.order_number}&token=${signOrderAccess(order.id, order.email)}`,
    notifyUrl: `${appOrigin}/api/payfast/notify`,
    reference: order.order_number,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, notEnabled: Boolean(result.notEnabled) },
      { status: 502 },
    );
  }

  return NextResponse.json({
    uuid: result.uuid,
    engineUrl: payFastOnsiteEngineUrl(sandbox),
    returnUrl: `${appOrigin}/checkout/success/${order.id}?ref=${order.order_number}&token=${signOrderAccess(order.id, order.email)}`,
    cancelUrl: `${appOrigin}/checkout/cancelled/${order.id}?ref=${order.order_number}&token=${signOrderAccess(order.id, order.email)}`,
  });
}
