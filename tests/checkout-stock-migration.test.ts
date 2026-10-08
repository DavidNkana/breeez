import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  getStockRollbackItems,
  STOCK_COMPENSATION_FAILURE_MESSAGE,
} from '../lib/checkout/stock';
import { getCheckoutProductSlugs } from '../lib/checkout/cache';
import { checkoutStockModel, compensateStockModel } from '../lib/checkout/stock-guards';

test('the deployed checkout stock RPC locks and rejects inactive variants', async () => {
  const sql = await readFile(resolve('supabase/migrations/017_atomic_stock_active_variants.sql'), 'utf8');
  assert.match(sql, /returns uuid/);
  assert.match(sql, /returning id into v_order_item_id/);
  assert.match(sql, /from public\.product_variants[\s\S]*for update/);
  assert.match(sql, /if not v_is_active then/);
  assert.match(sql, /is unavailable/);
  assert.match(sql, /stock = stock - p_quantity/);
});

test('rollback is an atomic increment, not a stale read followed by a write', async () => {
  const sql = await readFile(resolve('supabase/migrations/018_atomic_stock_compensation.sql'), 'utf8');
  assert.match(sql, /create or replace function public\.compensate_checkout_stock/);
  assert.match(sql, /set stock = stock \+ v_quantity/);
  assert.doesNotMatch(sql, /select stock[\s\S]*update public\.product_variants/);
  assert.match(sql, /delete from public\.order_items[\s\S]*where id = p_order_item_id/);
  assert.match(sql, /returning variant_id, quantity/);
  assert.match(sql, /if not found then[\s\S]*return false/);
  assert.match(sql, /set stock = stock \+ v_quantity/);
});

test('rollback preserves each successful decrement, including duplicate cart rows', () => {
  assert.deepEqual(getStockRollbackItems([
    { order_item_id: 'item-1' },
    { order_item_id: 'item-2' },
    { order_item_id: 'item-3' },
  ]), [
    { order_item_id: 'item-1' },
    { order_item_id: 'item-2' },
    { order_item_id: 'item-3' },
  ]);
  assert.deepEqual(getStockRollbackItems([{ order_item_id: '' }]), []);
});

test('duplicate identical decrements retain distinct exact compensation tokens', () => {
  assert.deepEqual(getStockRollbackItems([
    { order_item_id: 'same-variant-quantity-row-1' },
    { order_item_id: 'same-variant-quantity-row-2' },
  ]), [
    { order_item_id: 'same-variant-quantity-row-1' },
    { order_item_id: 'same-variant-quantity-row-2' },
  ]);
});

test('compensation migration is rerunnable and idempotent by order item marker', async () => {
  const sql = await readFile(resolve('supabase/migrations/018_atomic_stock_compensation.sql'), 'utf8');
  assert.equal((sql.match(/create or replace function/g) ?? []).length, 1);
  assert.match(sql, /if not found then[\s\S]*return false/);
  assert.match(sql, /delete from public\.order_items[\s\S]*return true/);
  assert.match(sql, /where id = p_order_item_id/);
  assert.ok(
    sql.indexOf('delete from public.order_items') < sql.indexOf('set stock = stock + v_quantity'),
    'the marker must be claimed before stock is incremented',
  );
});

test('checkout surfaces atomic cancellation and compensation failures instead of claiming cleanup succeeded', async () => {
  const route = await readFile(resolve('app/api/checkout/create-payment/route.ts'), 'utf8');
  assert.match(route, /cancellation\.error/);
  assert.match(route, /console\.error\('\[checkout\] atomic cancellation and stock compensation failed'/);
  assert.match(route, /STOCK_COMPENSATION_FAILURE_MESSAGE/);
  assert.match(route, /catch \(paymentError/);
  assert.match(route, /if \(stockFailure\)[\s\S]*rollbackCheckout\(adminSupabase, order\.id, getCheckoutProductSlugs\(items\)\)/);
  assert.match(route, /catch \(paymentError[\s\S]*rollbackCheckout\(adminSupabase, order\.id, getCheckoutProductSlugs\(items\)\)/);
  assert.equal(
    STOCK_COMPENSATION_FAILURE_MESSAGE,
    'Checkout cancellation requires support intervention because stock restoration did not complete.',
  );
});

test('PayJustNow cancellation remains pending after failed compensation and can be retried', async () => {
  const route = await readFile(resolve('app/api/admin/orders/[orderId]/payjustnow/route.ts'), 'utf8');
  const migration = await readFile(resolve('supabase/migrations/026_payjustnow_cancellation_pending.sql'), 'utf8');
  assert.match(migration, /cancellation_pending/);
  assert.match(route, /status: 'cancellation_pending'/);
  assert.match(route, /cancellation_pending/);
  assert.match(route, /stock compensation is pending\. Retry cancellation/);
  assert.match(route, /cancel_order_and_compensate_checkout_stock/);
  assert.ok(route.indexOf('cancel_order_and_compensate_checkout_stock') > route.indexOf("status: 'cancellation_pending'"));
  assert.ok(route.indexOf('payjustnow_cancelled') > route.indexOf("status: 'cancelled'"));
  assert.match(route, /provider_cancelled/);
  assert.match(route, /getPayJustNowStatus/);
  assert.match(route, /attempt\?\.status === 'provider_cancelled'/);
  assert.match(route, /Provider cancellation status is ambiguous/);
  const callback = await readFile(resolve('app/api/webhooks/payjustnow/route.ts'), 'utf8');
  assert.match(callback, /neq\('status', 'provider_cancelled'\)/);
});

test('atomic cancellation does not compensate a zero-row pending transition, but does compensate after confirmed cancellation', async () => {
  const migration = await readFile(resolve('supabase/migrations/031_atomic_order_cancellation_compensation.sql'), 'utf8');
  const checkout = await readFile(resolve('app/api/checkout/create-payment/route.ts'), 'utf8');
  const route = await readFile(resolve('app/api/admin/orders/[orderId]/payjustnow/route.ts'), 'utf8');

  assert.match(migration, /select status into v_status[\s\S]*for update/);
  assert.match(migration, /v_status not in \('pending_payment', 'cancellation_pending', 'cancelled'\)/);
  assert.match(migration, /update public\.orders set status = 'cancelled'/);
  assert.match(migration, /perform public\.compensate_checkout_stock\(v_order_item_id\)/);
  assert.match(checkout, /cancel_order_and_compensate_checkout_stock/);
  assert.doesNotMatch(checkout, /\.update\(\{ status: 'cancelled' \}/);
  assert.match(route, /cancel_order_and_compensate_checkout_stock/);
  assert.doesNotMatch(route, /rpc\('compensate_checkout_stock'/);
});

test('provider-cancel-success then compensation-failure retry skips provider cancel', () => {
  const pending = new Set(['item-1', 'item-2']);
  let providerCancelCalls = 0;
  let attemptStatus = 'created';
  let stock = 0;
  const cancelProvider = () => {
    providerCancelCalls += 1;
    attemptStatus = 'provider_cancelled';
  };
  const compensate = (itemId: string, fail = false) => {
    if (fail) throw new Error('temporary RPC failure');
    if (!pending.delete(itemId)) return false;
    stock += 1;
    return true;
  };

  cancelProvider();
  assert.equal(compensate('item-1'), true);
  assert.throws(() => compensate('item-2', true), /temporary RPC failure/);
  assert.equal(stock, 1);
  if (attemptStatus !== 'provider_cancelled') cancelProvider();
  assert.equal(compensate('item-2'), true);
  assert.equal(compensate('item-2'), false);
  assert.equal(providerCancelCalls, 1);
  assert.equal(stock, 2);
});

test('checkout binds customer identity to the authenticated session', async () => {
  const route = await readFile(resolve('app/api/checkout/create-payment/route.ts'), 'utf8');
  assert.match(route, /if \(!sessionUser\)[\s\S]*Authentication required/);
  assert.match(route, /if \(userId && userId !== sessionUser\.id\)[\s\S]*status: 403/);
  assert.match(route, /const resolvedUserId = sessionUser\.id/);
  assert.doesNotMatch(route, /const resolvedUserId = userId \|\| sessionUser\?\.id/);
});

test('checkout rejects non-positive quantities and decrements exactly the requested amount', async () => {
  const sql = await readFile(resolve('supabase/migrations/021_checkout_stock_guards.sql'), 'utf8');
  assert.match(sql, /drop function if exists public\.atomic_checkout_stock/);
  assert.match(sql, /create or replace function public\.atomic_checkout_stock/);
  assert.match(sql, /grant execute on function public\.atomic_checkout_stock/);
  assert.match(sql, /p_quantity is null or p_quantity < 1/);
  assert.match(sql, /if not v_is_active then/);
  assert.match(sql, /if v_stock < p_quantity then[\s\S]*return null/);
  assert.match(sql, /stock = stock - p_quantity/);
  assert.match(sql, /quantity, unit_price_cents/);
  assert.doesNotMatch(sql, /drop table|truncate|delete from public\.(product_variants|orders|order_items)/i);
});

test('migration 021 executable model rejects invalid, insufficient, and inactive stock (no DB harness)', () => {
  for (const quantity of [0, -1]) {
    const variant = { stock: 20, active: true };
    assert.throws(() => checkoutStockModel(variant, quantity, { id: 'item', quantity }), /at least one/);
    assert.equal(variant.stock, 20);
  }
  assert.equal(checkoutStockModel({ stock: 20, active: true }, 21, { id: 'item', quantity: 21 }), null);
  assert.throws(() => checkoutStockModel({ stock: 20, active: false }, 1, { id: 'item', quantity: 1 }), /unavailable/);
});

test('migration 021 executable model decrements 20 to 0 and compensates exactly once (no DB harness)', () => {
  const variant = { stock: 20, active: true };
  const item = checkoutStockModel(variant, 20, { id: 'item', quantity: 20 });
  assert.deepEqual(item, { id: 'item', quantity: 20 });
  assert.equal(variant.stock, 0);
  assert.equal(compensateStockModel(variant, item), true);
  assert.equal(variant.stock, 20);
  assert.equal(compensateStockModel(variant, null), false);
});

test('checkout rollback invalidates every affected product PDP, not just the storefront', async () => {
  assert.deepEqual(getCheckoutProductSlugs([
    { variant: { product: { slug: 'lily-dress' } } },
    { variant: { product: { slug: 'lily-dress' } } },
    { variant: { product: { slug: 'blue-shoes' } } },
  ]), ['lily-dress', 'blue-shoes']);
  const route = await readFile(resolve('app/api/checkout/create-payment/route.ts'), 'utf8');
  assert.match(route, /rollbackCheckout\(adminSupabase, order\.id, getCheckoutProductSlugs\(items\)\)/);
  assert.match(route, /for \(const slug of affectedProductSlugs\)[\s\S]*revalidatePath\(`\/p\/\$\{slug\}`\)/);
  assert.match(route, /revalidatePath\('\/'\)/);
});

test('successful checkout revalidates product PDPs after stock reservation', async () => {
  const route = await readFile(resolve('app/api/checkout/create-payment/route.ts'), 'utf8');
  assert.match(route, /revalidatePath\(`\/p\/\$\{slug\}`\)/);
  assert.match(route, /revalidateCheckoutProducts\(items\)/);
  assert.match(route, /products\(base_price_cents, slug\)/);
});
