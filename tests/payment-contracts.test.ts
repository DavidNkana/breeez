import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('migration 022 allows legacy reads and active PayFast or PayJustNow for new providers', async () => {
  const sql = await readFile(resolve('supabase/migrations/022_active_provider_contracts.sql'), 'utf8');
  assert.match(sql, /payment_gateway in \('payfast', 'payjustnow', 'yoco', 'ozow'\)/);
  assert.match(sql, /payment_gateway not in \('payfast', 'payjustnow'\)/);
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
  // The ITN logic lives in one shared handler; both published routes delegate
  // to it so there is a single implementation.
  const webhook = await readFile(resolve('lib/payments/payfast-notify.ts'), 'utf8');
  const canonicalRoute = await readFile(resolve('app/api/payfast/notify/route.ts'), 'utf8');
  const aliasRoute = await readFile(resolve('app/api/webhooks/payfast/route.ts'), 'utf8');
  for (const event of ['checkout_started', 'pending_payment_created', 'payfast_redirect', 'payment_failed']) assert.match(checkout, new RegExp(event));
  assert.doesNotMatch(checkout, /abandoned_pending/);
  for (const event of ['payfast_itn_invalid', 'payfast_itn_valid']) assert.match(webhook, new RegExp(event));
  assert.match(webhook, /mark_order_paid_from_payfast/);
  assert.match(canonicalRoute, /handlePayFastNotify/);
  assert.match(aliasRoute, /handlePayFastNotify/);
  const eventsSql = await readFile(resolve('supabase/migrations/023_payment_events.sql'), 'utf8');
  assert.match(eventsSql, /paid_transition/);
  assert.match(eventsSql, /pending_payment_created/);
  assert.doesNotMatch(eventsSql, /abandoned_pending/);
  assert.match(eventsSql, /no authoritative timeout\/reconciliation job/);
});

test('create-payment cannot overwrite a webhook-established payment identity', async () => {
  const checkout = await readFile(resolve('app/api/checkout/create-payment/route.ts'), 'utf8');
  const update = checkout.match(/\.update\(paymentUpdate as any\)([\s\S]*?)await recordPaymentEvent/);
  assert.ok(update, 'payment identity update should remain adjacent to redirect event recording');
  assert.match(update[1], /\.eq\('id', order\.id\)/);
  assert.match(update[1], /\.eq\('status', 'pending_payment'\)/);
  assert.match(checkout, /valid ITN may mark the order paid/);
});

test('PayJustNow is configuration-gated and has an independent callback route', async () => {
  const checkout = await readFile(resolve('app/api/checkout/create-payment/route.ts'), 'utf8');
  const callback = await readFile(resolve('app/api/webhooks/payjustnow/route.ts'), 'utf8');
  const payments = await readFile(resolve('lib/payments/payjustnow.ts'), 'utf8');
  assert.match(checkout, /isPayJustNowConfigured/);
  assert.match(checkout, /paymentMethod === 'payjustnow'/);
  assert.match(callback, /request\.text\(\)/);
  assert.match(callback, /verifyPayJustNowSignature/);
   assert.match(callback, /body\.merchantOrderReference/);
   assert.match(callback, /checkoutToken|paymentReference|checkoutPaymentStatus/);
   assert.doesNotMatch(callback, /body\.orderReference|body\.checkoutCurrency/);
   assert.match(payments, /body\.currency/);
  assert.doesNotMatch(callback, /payfast/);
});

test('PayJustNow persistence is prepared before remote creation and paid orders are not rolled back', async () => {
  const checkout = await readFile(resolve('app/api/checkout/create-payment/route.ts'), 'utf8');
  const migration = await readFile(resolve('supabase/migrations/025_payjustnow_attempts.sql'), 'utf8');
  assert.match(checkout, /prepare_payjustnow_attempt/);
  assert.match(checkout, /status.*paid/);
  assert.match(migration, /create or replace function public\.prepare_payjustnow_attempt/);
  assert.match(migration, /on conflict \(provider, request_id\) do nothing/);
});

test('PayJustNow callback claims the prepared attempt before requiring order token persistence', async () => {
  const webhook = await readFile(resolve('app/api/webhooks/payjustnow/route.ts'), 'utf8');
  const migration = await readFile(resolve('supabase/migrations/030_payjustnow_callback_claim.sql'), 'utf8');
  assert.match(webhook, /payment_attempts/);
  assert.match(webhook, /claim_payjustnow_callback/);
  assert.doesNotMatch(webhook, /!order\.payment_checkout_token/);
  assert.match(migration, /request_id = p_request_id/);
  assert.match(migration, /checkout_token is null or checkout_token = p_checkout_token/);
  assert.match(migration, /payment_checkout_token = p_checkout_token/);
  assert.match(migration, /grant execute on function public\.claim_payjustnow_callback[^\n]* to service_role/);
});

test('PayJustNow callback claim rejects reference races and rolls back partial claims', async () => {
  const migration = await readFile(resolve('supabase/migrations/030_payjustnow_callback_claim.sql'), 'utf8');
  assert.match(migration, /payment_reference is null or payment_reference = p_payment_reference/);
  assert.match(migration, /raise exception using errcode = 'P0001'/);
  assert.match(migration, /when sqlstate 'P0001' then return false/);
  assert.match(migration, /payment_checkout_token = p_checkout_token/);
});

test('PayJustNow create request leaves callback installation to the provider gateway', async () => {
  const payments = await readFile(resolve('lib/payments/payjustnow.ts'), 'utf8');
  const server = await readFile(resolve('lib/payments/server.ts'), 'utf8');
  const env = await readFile(resolve('.env.example'), 'utf8');
  const docs = await readFile(resolve('docs/payjustnow-contract.md'), 'utf8');
  assert.doesNotMatch(payments, /callbackUrl/);
  assert.doesNotMatch(server, /callbackUrl/);
  assert.doesNotMatch(env, /PAYJUSTNOW_CALLBACK_URL/);
  assert.match(docs, /checkoutStatusCallbackUrl/);
});

test('PayJustNow paid events are emitted only after a changed guarded row', async () => {
  const migration = await readFile(resolve('supabase/migrations/025_payjustnow_attempts.sql'), 'utf8');
  const repair = await readFile(resolve('supabase/migrations/027_payjustnow_repairs.sql'), 'utf8');
  for (const sql of [migration, repair]) {
    assert.match(sql, /get diagnostics changed = row_count/);
    assert.match(sql, /if changed > 0 then[\s\S]*insert into public\.payment_events/);
    assert.match(sql, /and status = 'pending_payment'/);
    assert.doesNotMatch(sql, /status = 'paid' and payment_reference/);
  }
});

test('PayJustNow paid reconciliation wins pending races but never revives released stock', async () => {
  const migration = await readFile(resolve('supabase/migrations/029_payjustnow_no_cancelled_paid.sql'), 'utf8');
  assert.match(migration, /status in \('pending_payment', 'cancellation_pending'\)/);
  assert.doesNotMatch(migration, /status in \([^)]*cancelled/);
  assert.match(migration, /insert into public\.payment_events/);
  const webhook = await readFile(resolve('app/api/webhooks/payjustnow/route.ts'), 'utf8');
  assert.match(webhook, /cancellation_pending.*cancelled/);
  assert.match(webhook, /order\.status === 'cancelled'/);
  assert.match(webhook, /action: 'refund'/);
  assert.match(webhook, /status: 'manual_review'/);
  const route = await readFile(resolve('app/api/admin/orders/[orderId]/payjustnow/route.ts'), 'utf8');
  assert.match(route, /status === 'paid'/);
  assert.match(route, /mark_order_paid_from_payjustnow/);
  assert.match(route, /currency, status/);
  assert.match(route, /Provider status amount or currency does not match/);
});

test('PayJustNow admin actions confirm local transitions before recording success', async () => {
  const route = await readFile(resolve('app/api/admin/orders/[orderId]/payjustnow/route.ts'), 'utf8');
  assert.match(route, /select\('id, status'\)\.maybeSingle\(\)/);
  assert.match(route, /if \(!update\.data\)/);
  assert.match(route, /recordPaymentEvent/);
});

test('success page never uses an order UUID without authenticated customer scope', async () => {
  const page = await readFile(resolve('app/checkout/success/[order]/page.tsx'), 'utf8');
  assert.match(page, /getCurrentUser/);
  assert.match(page, /eq\('id', params\.order\)\.eq\('customer_id', user\.id\)/);
  assert.match(page, /Payment confirmation received/);
  assert.doesNotMatch(page, /\.eq\('id', params\.order\)\.maybeSingle\(\)/);
});
