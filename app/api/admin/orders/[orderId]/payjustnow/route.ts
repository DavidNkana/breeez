import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/session';
import { classifyPayJustNowCancellationStatus, getPayJustNowStatus, payJustNowCancelOrRefund, validatePayJustNowStatus } from '@/lib/payments/payjustnow';
import { recordPaymentEvent } from '@/lib/payments/events';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: { orderId: string } }) {
  try {
    await requireAdmin();
    const { action } = await request.json().catch(() => ({}));
    if (action !== 'cancel' && action !== 'refund') return NextResponse.json({ error: 'Action must be cancel or refund.' }, { status: 400 });
    const admin: any = await createAdminClient();
    const { data: order, error } = await admin.from('orders')
      .select('id, order_number, payment_gateway, payment_reference, payment_checkout_token, total_cents, currency, status')
      .eq('id', params.orderId).maybeSingle();
    if (error || !order || order.payment_gateway !== 'payjustnow' || order.currency !== 'ZAR' || !order.payment_checkout_token) return NextResponse.json({ error: 'PayJustNow order not found.' }, { status: 404 });
    if (action === 'cancel' && order.status === 'cancelled') return NextResponse.json({ ok: true, alreadyApplied: true });
    if (action === 'refund' && order.status === 'refunded') return NextResponse.json({ ok: true, alreadyApplied: true });
    if (action === 'cancel' && !['pending_payment', 'cancellation_pending'].includes(order.status)) return NextResponse.json({ error: 'Only pending PayJustNow orders can be cancelled.' }, { status: 409 });
    if (action === 'refund' && !['paid', 'processing', 'shipped', 'delivered'].includes(order.status)) return NextResponse.json({ error: 'Only paid PayJustNow orders can be refunded.' }, { status: 409 });

    const { data: attempt } = action === 'cancel'
      ? await admin.from('payment_attempts').select('id, status, payment_reference').eq('order_id', order.id).eq('provider', 'payjustnow').order('created_at', { ascending: false }).limit(1).maybeSingle()
      : { data: null };

    if (action === 'cancel' && order.status === 'pending_payment') {
      const pending = await admin.from('orders').update({ status: 'cancellation_pending' } as any)
        .eq('id', order.id).eq('status', 'pending_payment').select('id').maybeSingle();
      if (pending.error) return NextResponse.json({ error: 'Could not persist cancellation-pending state.' }, { status: 500 });
      if (!pending.data) {
        const current = await admin.from('orders').select('status').eq('id', order.id).maybeSingle();
        if (current.data?.status === 'cancelled') return NextResponse.json({ ok: true, alreadyApplied: true });
        if (current.data?.status !== 'cancellation_pending') return NextResponse.json({ error: 'Order changed before cancellation could start.' }, { status: 409 });
      }
    }

    let result: Awaited<ReturnType<typeof payJustNowCancelOrRefund>>;
    if (action === 'cancel' && attempt?.status === 'provider_cancelled') {
      result = { ok: true, status: 200, body: { checkoutPaymentStatus: 'CANCELLED_BY_MERCHANT', alreadyConfirmed: true } };
    } else if (action === 'cancel' && attempt && attempt.status !== 'created') {
      let providerStatus: Record<string, unknown>;
      try {
          providerStatus = await getPayJustNowStatus(order.payment_checkout_token, order.total_cents, order.currency);
      } catch {
        return NextResponse.json({ error: 'Provider cancellation status is ambiguous. Retry cancellation.', status: 'cancellation_pending' }, { status: 503 });
      }
      const providerValidation = validatePayJustNowStatus(providerStatus, order.payment_checkout_token, order.total_cents, order.currency);
      if (!providerValidation.ok) return NextResponse.json({ error: 'Provider status amount or currency does not match the local order. Manual review required.', status: 'cancellation_pending' }, { status: 503 });
      const status = classifyPayJustNowCancellationStatus(String(providerStatus.checkoutPaymentStatus ?? ''));
      if (status === 'confirmed') {
        result = { ok: true, status: 200, body: providerStatus };
       } else if (status === 'paid') {
         const paymentReference = typeof providerStatus.paymentReference === 'string'
           ? providerStatus.paymentReference
           : attempt?.payment_reference;
         if (!paymentReference) return NextResponse.json({ error: 'Provider reports paid without a payment reference. Manual review required.', status: 'cancellation_pending' }, { status: 503 });
          const reconciled = await admin.rpc('mark_order_paid_from_payjustnow' as any, {
            p_order_id: order.id, p_request_id: `reconcile-${order.id}`, p_checkout_token: order.payment_checkout_token,
            p_payment_reference: paymentReference, p_amount_cents: Number(providerStatus.checkoutTotalCents), p_currency: String(providerStatus.currency),
         } as any);
         if (reconciled.error) return NextResponse.json({ error: 'Provider reports paid, but local reconciliation failed. Manual review required.', status: 'cancellation_pending' }, { status: 503 });
         const current = await admin.from('orders').select('status, payment_reference').eq('id', order.id).maybeSingle();
         if (current.data?.status !== 'paid' || current.data.payment_reference !== paymentReference) return NextResponse.json({ error: 'Provider reports paid, but local reconciliation was not confirmed. Manual review required.', status: 'cancellation_pending' }, { status: 503 });
         await admin.from('payment_attempts').update({ status: 'paid', payment_reference: paymentReference, updated_at: new Date().toISOString() }).eq('id', attempt?.id ?? '');
         return NextResponse.json({ ok: true, reconciled: true });
      } else if (status === 'ambiguous') {
        return NextResponse.json({ error: 'Provider cancellation status is ambiguous. Retry cancellation.', status: 'cancellation_pending' }, { status: 503 });
      } else {
        result = await payJustNowCancelOrRefund({ action, checkoutToken: order.payment_checkout_token, orderNumber: order.order_number });
      }
    } else {
      result = await payJustNowCancelOrRefund({ action, checkoutToken: order.payment_checkout_token, orderNumber: order.order_number, amountCents: action === 'refund' ? order.total_cents : undefined });
    }
     if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

     if (action === 'cancel') {
       const beforeCompensation = await admin.from('orders').select('status').eq('id', order.id).maybeSingle();
       if (beforeCompensation.data?.status === 'paid') return NextResponse.json({ ok: true, reconciled: true });
       if (beforeCompensation.data?.status === 'cancelled') return NextResponse.json({ ok: true, alreadyApplied: true });
      if (attempt?.status !== 'provider_cancelled') {
        const confirmed = await admin.from('payment_attempts').update({ status: 'provider_cancelled', updated_at: new Date().toISOString() })
          .eq('id', attempt?.id ?? '').select('id').maybeSingle();
        if (confirmed.error || !confirmed.data) return NextResponse.json({ error: 'Provider cancelled, but cancellation state could not be persisted. Retry cancellation.', status: 'cancellation_pending' }, { status: 503 });
      }
      const cancellation = await admin.rpc('cancel_order_and_compensate_checkout_stock' as any, { p_order_id: order.id } as any);
      if (cancellation.error || cancellation.data !== true) {
        const current = await admin.from('orders').select('status').eq('id', order.id).maybeSingle();
        if (current.data?.status === 'paid') return NextResponse.json({ ok: true, reconciled: true });
        if (current.data?.status === 'cancelled') return NextResponse.json({ ok: true, alreadyApplied: true });
        return NextResponse.json({ error: 'Provider cancelled, but stock compensation is pending. Retry cancellation.', status: 'cancellation_pending' }, { status: 500 });
      }
    } else {
      const update = await admin.from('orders').update({ status: 'refunded' } as any)
        .eq('id', order.id).eq('status', order.status).select('id, status').maybeSingle();
      if (update.error) return NextResponse.json({ error: 'Provider action succeeded but local order update failed. Contact support.' }, { status: 500 });
      if (!update.data) {
        const current = await admin.from('orders').select('status').eq('id', order.id).maybeSingle();
        if (current.data?.status === 'refunded') return NextResponse.json({ ok: true, alreadyApplied: true });
        return NextResponse.json({ error: 'Provider action succeeded but local order state was not transitioned. Contact support.' }, { status: 409 });
      }
    }
    await recordPaymentEvent(admin, order.id, action === 'cancel' ? 'payjustnow_cancelled' : 'payjustnow_refunded', `${action}:${order.payment_checkout_token}`, { gateway: 'payjustnow' });
    return NextResponse.json({ ok: true, providerResponse: result.body });
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error;
    console.error('[payjustnow admin action]', error);
    return NextResponse.json({ error: 'PayJustNow action failed.' }, { status: 502 });
  }
}
