import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPayJustNowConfig, isPayJustNowConfigured, payJustNowCancelOrRefund, validatePayJustNowCallback, verifyPayJustNowSignature } from '@/lib/payments/payjustnow';
import { recordPaymentEvent } from '@/lib/payments/events';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const config = getPayJustNowConfig();
  if (!isPayJustNowConfigured(config)) return NextResponse.json({ error: 'PayJustNow is not configured' }, { status: 503 });
  const raw = await request.text();
  const signature = request.headers.get('X-Signature') ?? request.headers.get('x-signature') ?? '';
  if (!verifyPayJustNowSignature(raw, signature, config.signingSecret)) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
   try {
     const body = JSON.parse(raw) as Record<string, unknown>;
     const orderNumber = typeof body.merchantOrderReference === 'string' || typeof body.merchantOrderReference === 'number'
       ? String(body.merchantOrderReference) : undefined;
    if (!orderNumber) return NextResponse.json({ error: 'Missing order identity' }, { status: 400 });
    const admin: any = await createAdminClient();
    const { data: order, error } = await admin.from('orders')
      .select('id, order_number, total_cents, currency, payment_gateway, status, payment_reference, payment_request_id, payment_checkout_token')
      .eq('order_number', orderNumber).maybeSingle();
    if (error || !order || order.payment_gateway !== 'payjustnow') return NextResponse.json({ error: 'Order not found' }, { status: 404 });
     if (order.currency !== 'ZAR') return NextResponse.json({ error: 'Currency mismatch' }, { status: 400 });
      const callback = validatePayJustNowCallback({ body, expectedOrderNumber: order.order_number, expectedCurrency: order.currency, expectedAmountCents: order.total_cents });
    if (!callback.ok) {
      await recordPaymentEvent(admin, order.id, 'payjustnow_callback_invalid', `invalid:${orderNumber}`, { gateway: 'payjustnow', reason: callback.error });
      return NextResponse.json({ error: callback.error }, { status: 400 });
      }
      const checkoutToken = callback.checkoutToken;
      const preparedAttemptQuery = admin.from('payment_attempts')
        .select('id, checkout_token, payment_reference, status')
        .eq('order_id', order.id).eq('provider', 'payjustnow')
        .eq('request_id', order.payment_request_id ?? `callback-${order.id}`);
      if (order.status !== 'cancelled') preparedAttemptQuery.neq('status', 'provider_cancelled');
      const { data: preparedAttempt, error: preparedAttemptError } = await preparedAttemptQuery.maybeSingle();
      if (preparedAttemptError || !preparedAttempt) {
        await recordPaymentEvent(admin, order.id, 'payjustnow_callback_invalid', `invalid-attempt:${callback.paymentReference}`, { gateway: 'payjustnow', reason: 'Prepared payment attempt not found' });
        return NextResponse.json({ error: 'Payment attempt not found' }, { status: 409 });
      }
      if (preparedAttempt.checkout_token && checkoutToken !== preparedAttempt.checkout_token) {
        await recordPaymentEvent(admin, order.id, 'payjustnow_callback_invalid', `invalid-token:${callback.paymentReference}`, { gateway: 'payjustnow', reason: 'Checkout token mismatch' });
        return NextResponse.json({ error: 'Checkout token mismatch' }, { status: 400 });
      }
      if (preparedAttempt.payment_reference && preparedAttempt.payment_reference !== callback.paymentReference) {
        await recordPaymentEvent(admin, order.id, 'payjustnow_callback_invalid', `invalid-reference:${callback.paymentReference}`, { gateway: 'payjustnow', reason: 'Payment reference mismatch' });
        return NextResponse.json({ error: 'Payment reference mismatch' }, { status: 400 });
      }
      const claimed = await admin.rpc('claim_payjustnow_callback' as any, {
        p_order_id: order.id,
        p_request_id: order.payment_request_id ?? `callback-${order.id}`,
        p_checkout_token: checkoutToken,
        p_payment_reference: callback.paymentReference,
      } as any);
      if (claimed.error || claimed.data !== true) {
        await recordPaymentEvent(admin, order.id, 'payjustnow_callback_invalid', `invalid-claim:${callback.paymentReference}`, { gateway: 'payjustnow', reason: 'Checkout token could not be bound to the prepared payment attempt' });
        return NextResponse.json({ error: 'Checkout token mismatch' }, { status: 409 });
      }
      if (order.status === 'paid') {
       if (order.payment_reference === callback.paymentReference) return new Response('OK', { status: 200 });
       return NextResponse.json({ error: 'Order already has a different payment reference' }, { status: 409 });
     }
     if (!['pending_payment', 'cancellation_pending', 'cancelled'].includes(order.status)) return NextResponse.json({ error: 'Order is not payable' }, { status: 409 });
      await recordPaymentEvent(admin, order.id, 'payjustnow_callback_valid', `callback:${callback.paymentReference}`, { gateway: 'payjustnow', status: callback.status });
      if (order.status === 'cancelled') {
        await admin.from('payment_attempts').update({ status: 'refund_pending', updated_at: new Date().toISOString() })
          .eq('provider', 'payjustnow').eq('checkout_token', checkoutToken);
        const refund = await payJustNowCancelOrRefund({ action: 'refund', checkoutToken, orderNumber: order.order_number, amountCents: order.total_cents });
        if (refund.ok) {
          await admin.from('payment_attempts').update({ status: 'refunded', updated_at: new Date().toISOString() })
            .eq('provider', 'payjustnow').eq('checkout_token', checkoutToken);
          await recordPaymentEvent(admin, order.id, 'payjustnow_refunded', `late-refund:${callback.paymentReference}`, { gateway: 'payjustnow', amountCents: order.total_cents });
          return new Response('OK', { status: 200 });
        }
        await admin.from('payment_attempts').update({ status: 'manual_review', updated_at: new Date().toISOString() })
          .eq('provider', 'payjustnow').eq('checkout_token', checkoutToken);
        return NextResponse.json({ error: 'Payment arrived after cancellation and refund requires manual review.' }, { status: 503 });
      }
      const { data: markedPaid, error: markError } = await admin.rpc('mark_order_paid_from_payjustnow' as any, {
      p_order_id: order.id, p_request_id: order.payment_request_id ?? `callback-${order.id}`, p_checkout_token: checkoutToken,
      p_payment_reference: callback.paymentReference, p_amount_cents: order.total_cents, p_currency: order.currency,
    } as any);
     if (markError) return NextResponse.json({ error: 'Order payment update failed' }, { status: 409 });
     if (markedPaid !== true) {
       const state = await admin.from('orders').select('status, payment_reference').eq('id', order.id).maybeSingle();
       if (state.data?.status === 'paid' && state.data.payment_reference === callback.paymentReference) return new Response('OK', { status: 200 });
       return NextResponse.json({ error: 'Order payment update failed' }, { status: 409 });
     }
    await admin.from('payment_attempts').update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('provider', 'payjustnow').eq('checkout_token', checkoutToken);
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[payjustnow webhook]', error);
    return NextResponse.json({ error: 'Payment notification rejected' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'PayJustNow callbacks require POST' }, { status: 405 });
}
