import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('migration 022 allows legacy reads but only PayFast for new or changed providers', async () => {
  const sql = await readFile(resolve('supabase/migrations/022_active_provider_contracts.sql'), 'utf8');
  assert.match(sql, /payment_gateway in \('payfast', 'payjustnow', 'yoco', 'ozow'\)/);
  assert.match(sql, /if new\.payment_gateway is distinct from 'payfast' then/);
  assert.doesNotMatch(sql, /distinct from 'payjustnow'/);
});

test('payment event contract is service-role-only and idempotent', async () => {
  const sql = await readFile(resolve('supabase/migrations/023_payment_events.sql'), 'utf8');
  assert.match(sql, /create table if not exists public\.payment_events/);
  assert.match(sql, /unique \(order_id, event_type, idempotency_key\)/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke execute on function public\.record_payment_event/);
  assert.match(sql, /grant execute on function public\.record_payment_event[^\n]* to service_role/);
  assert.match(sql, /on conflict \(order_id, event_type, idempotency_key\) do nothing/);
  assert.match(sql, /card|gateway/i);
  assert.doesNotMatch(sql, /card_number|cvv|request_body/i);
});

test('checkout and PayFast webhook write bounded funnel events', async () => {
  const checkout = await readFile(resolve('app/api/checkout/create-payment/route.ts'), 'utf8');
  const webhook = await readFile(resolve('app/api/webhooks/payfast/route.ts'), 'utf8');
  for (const event of ['checkout_started', 'pending_payment_created', 'payfast_redirect', 'payment_failed']) assert.match(checkout, new RegExp(event));
  assert.doesNotMatch(checkout, /abandoned_pending/);
  for (const event of ['payfast_itn_invalid', 'payfast_itn_valid']) assert.match(webhook, new RegExp(event));
  assert.match(webhook, /mark_order_paid_from_payfast/);
  const eventsSql = await readFile(resolve('supabase/migrations/023_payment_events.sql'), 'utf8');
  assert.match(eventsSql, /paid_transition/);
  assert.match(eventsSql, /pending_payment_created/);
  assert.doesNotMatch(eventsSql, /abandoned_pending/);
  assert.match(eventsSql, /no authoritative timeout\/reconciliation job/);
});

test('create-payment cannot overwrite a webhook-established payment reference', async () => {
  const checkout = await readFile(resolve('app/api/checkout/create-payment/route.ts'), 'utf8');
  const update = checkout.match(/\.update\(\{ payment_reference: intent\.reference \} as any\)([\s\S]*?)await recordPaymentEvent/);
  assert.ok(update, 'payment reference update should remain adjacent to redirect event recording');
  assert.match(update[1], /\.eq\('id', order\.id\)/);
  assert.match(update[1], /\.eq\('status', 'pending_payment'\)/);
  assert.match(checkout, /valid ITN may mark the order paid/);
});

test('success page never uses an order UUID without authenticated customer scope', async () => {
  const page = await readFile(resolve('app/checkout/success/[order]/page.tsx'), 'utf8');
  assert.match(page, /getCurrentUser/);
  assert.match(page, /eq\('id', params\.order\)\.eq\('customer_id', user\.id\)/);
  assert.match(page, /Payment confirmation received/);
  assert.doesNotMatch(page, /\.eq\('id', params\.order\)\.maybeSingle\(\)/);
});
