export type PaymentEventType =
  | 'checkout_started'
  | 'payfast_redirect'
  | 'payfast_itn_valid'
  | 'payfast_itn_invalid'
  | 'payment_failed'
  | 'paid_transition'
  | 'pending_payment_created';

const safeTypes = new Set<PaymentEventType>([
  'checkout_started', 'payfast_redirect', 'payfast_itn_valid', 'payfast_itn_invalid',
  'payment_failed', 'paid_transition', 'pending_payment_created',
]);

/** Best-effort server-side funnel measurement. Payloads contain no customer secrets or card data. */
export async function recordPaymentEvent(
  admin: { rpc: (name: string, args: Record<string, unknown>) => Promise<{ error?: { message?: string } | null }> },
  orderId: string,
  eventType: PaymentEventType,
  idempotencyKey: string,
  payload: Record<string, string | number | boolean> = {},
): Promise<void> {
  if (!safeTypes.has(eventType) || !idempotencyKey) return;
  try {
    const { error } = await admin.rpc('record_payment_event' as any, {
      p_order_id: orderId,
      p_event_type: eventType,
      p_idempotency_key: idempotencyKey,
      p_payload: payload,
    });
    if (error) console.error('[payment event]', error.message ?? 'event write failed');
  } catch (error) {
    console.error('[payment event]', error);
  }
}
