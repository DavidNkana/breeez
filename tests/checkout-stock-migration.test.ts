import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  getStockRollbackItems,
  STOCK_COMPENSATION_FAILURE_MESSAGE,
} from '../lib/checkout/stock';

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

test('checkout surfaces compensation failures instead of claiming cleanup succeeded', async () => {
  const route = await readFile(resolve('app/api/checkout/create-payment/route.ts'), 'utf8');
  assert.match(route, /compensation\.error/);
  assert.match(route, /console\.error\('\[checkout\] stock compensation failed'/);
  assert.match(route, /STOCK_COMPENSATION_FAILURE_MESSAGE/);
  assert.match(route, /p_order_item_id: order_item_id/);
  assert.match(route, /catch \(paymentError/);
  assert.match(route, /if \(stockFailure\)[\s\S]*rollbackCheckout\(adminSupabase, order\.id, successfulDecrements\)/);
  assert.match(route, /catch \(paymentError[\s\S]*rollbackCheckout\(adminSupabase, order\.id, successfulDecrements\)/);
  assert.equal(
    STOCK_COMPENSATION_FAILURE_MESSAGE,
    'Checkout cancellation requires support intervention because stock restoration did not complete.',
  );
});
