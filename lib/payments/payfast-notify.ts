import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validatePayFastNotification, verifyPayFastSignature } from '@/lib/payments/payfast';
import { recordPaymentEvent } from '@/lib/payments/events';
import { sendOrderReceived } from '@/lib/email/resend';
import { signOrderAccess } from '@/lib/orders/access';
import { getPayFastAppOrigin } from '@/lib/payments/payfast';

/**
 * PayFast Instant Transaction Notification (ITN) handler.
 *
 * Shared by two routes so there is exactly one implementation:
 *   - POST /api/payfast/notify        (the path published in the PayFast docs)
 *   - POST /api/webhooks/payfast      (the original path)
 *
 * Security rules enforced here:
 *   - the local signature must verify against the merchant passphrase
 *   - Payfast's own validation endpoint must confirm the transaction server-side
 *     (a signed ITN alone is not enough — it can be fabricated)
 *   - merchant id, order reference, amount and currency must all match the order
 *   - the paid transition is idempotent and only ever applied to a
 *     `pending_payment` order
 *
 * Payfast expects a plain "OK" body with HTTP 200 when the notification is
 * accepted; anything else makes it retry and eventually dead-letter.
 */
export async function handlePayFastNotify(request: Request): Promise<Response> {
  try {
    const raw = await request.text();
    const params = new URLSearchParams(raw);
    const entries = [...params.entries()];
    const signature = params.get('signature') || '';
    const passphrase = process.env.PAYFAST_PASSPHRASE;
    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    if (!merchantId) return NextResponse.json({ error: 'PayFast credentials not configured' }, { status: 503 });
    if (!verifyPayFastSignature(entries.filter(([key]) => key !== 'signature'), signature, passphrase)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    const requestedOrderId = params.get('custom_str1');
    if (!requestedOrderId) return NextResponse.json({ error: 'Missing order identity' }, { status: 400 });

    // PayFast's server-to-server validation prevents a signed but fabricated ITN
    // from changing an order. Fail closed when the validation service is unavailable.
    const validationUrl = process.env.PAYFAST_SANDBOX === 'true'
      ? 'https://sandbox.payfast.co.za/eng/query/validate'
      : 'https://www.payfast.co.za/eng/query/validate';
    const validation = await fetch(validationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: raw,
      signal: AbortSignal.timeout(10000),
    });
    if (!validation.ok || (await validation.text()).trim() !== 'VALID') {
      return NextResponse.json({ error: 'PayFast validation failed' }, { status: 400 });
    }

    const admin: any = await createAdminClient();
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, total_cents, currency, payment_gateway, status, payment_reference')
      .eq('id', requestedOrderId)
      .maybeSingle();
    if (orderError || !order || order.payment_gateway !== 'payfast') {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    const notification = validatePayFastNotification({ fields: new Map(entries), signature, passphrase, merchantId, expectedAmountCents: order.total_cents, expectedCurrency: order.currency });
    if (!notification.ok) {
      await recordPaymentEvent(admin, order.id, 'payfast_itn_invalid', 'payfast-itn-invalid', { reason: notification.error });
      return NextResponse.json({ error: notification.error }, { status: 400 });
    }
    const { orderId: orderIdFromNotification, paymentId, amountCents } = notification;
    if (orderIdFromNotification !== requestedOrderId) {
      await recordPaymentEvent(admin, order.id, 'payfast_itn_invalid', 'payfast-itn-invalid-order', { reason: 'Order identity mismatch' });
      return NextResponse.json({ error: 'Order identity mismatch' }, { status: 400 });
    }
    await recordPaymentEvent(admin, order.id, 'payfast_itn_valid', `payfast-itn:${paymentId}`, { gateway: 'payfast' });
    if (order.status === 'paid' && order.payment_reference === paymentId) return new Response('OK', { status: 200 });
    if (order.status !== 'pending_payment' || (order.payment_reference && order.payment_reference !== orderIdFromNotification)) {
      return NextResponse.json({ error: 'Order is not payable' }, { status: 409 });
    }

    const { data: markedPaid, error: markError } = await admin.rpc('mark_order_paid_from_payfast' as any, {
      p_order_id: orderIdFromNotification,
      p_payment_id: paymentId,
      p_amount_cents: amountCents,
      p_merchant_id: merchantId,
    } as any);
    if (markError || markedPaid !== true) return NextResponse.json({ error: 'Order payment update failed' }, { status: 409 });

    // The payment is verified and the order is paid — tell the customer.
    // This is the notification that turns a checkout into a tracked order.
    try {
      const { data: paidOrder } = await admin
        .from('orders')
        .select('id, order_number, email, total_cents')
        .eq('id', orderIdFromNotification)
        .maybeSingle();
      const { data: paidItems } = await admin
        .from('order_items')
        .select('*')
        .eq('order_id', orderIdFromNotification);
      if (paidOrder) {
        const itemsHtml = (paidItems ?? [])
          .map(
            (row: any) =>
              `<div style="font-size:14px;color:#566c7d;margin:4px 0">${row.quantity}× ${row.product_name}${row.variant_name ? ` — ${row.variant_name}` : ''} — R${(row.line_total_cents / 100).toFixed(2)}</div>`,
          )
          .join('');
        const appOrigin = getPayFastAppOrigin();
        const token = signOrderAccess(paidOrder.id, paidOrder.email);
        const receiptUrl = `${appOrigin}/checkout/success/${paidOrder.id}?ref=${paidOrder.order_number}&token=${token}`;
        await sendOrderReceived({
          to: paidOrder.email,
          orderNumber: paidOrder.order_number,
          totalRand: `R${((paidOrder.total_cents ?? 0) / 100).toFixed(2)}`,
          items: itemsHtml,
          receiptUrl,
        });
      }
    } catch (emailError) {
      // Never fail the notification over an email problem — the order is paid.
      console.error('[payfast notify] order received email failed', emailError);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[payfast notify]', error);
    return NextResponse.json({ error: 'Payment notification rejected' }, { status: 503 });
  }
}
