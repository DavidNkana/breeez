import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

test('cancelling an order returns the stock to the products', async () => {
  // The cancellation must use the non-destructive restore, so the invoice
  // still shows what the customer ordered.
  const sql = await readFile(resolve('supabase/APPLY-033-stock-restoration.sql'), 'utf8');
  assert.match(sql, /stock_restored/);
  assert.match(sql, /create or replace function public\.restore_order_stock/);
  assert.match(sql, /create or replace function public\.cancel_order_and_restore_stock/);
  // Stock must never be credited twice.
  assert.match(sql, /v_already_restored/);

  const adminRoute = await readFile(resolve('app/api/admin/orders/[orderId]/status/route.ts'), 'utf8');
  assert.match(adminRoute, /cancel_order_and_restore_stock/);
  assert.match(adminRoute, /stockRestored: true/);
});

test('walking away from the payment step cancels the order and restores the cart', async () => {
  // Payfast must send the customer to our cancellation page, not to an empty cart.
  const server = await readFile(resolve('lib/payments/server.ts'), 'utf8');
  assert.match(server, /cancelUrl: `\$\{appOrigin\}\/checkout\/cancelled\//);

  const page = await readFile(resolve('app/checkout/cancelled/[order]/page.tsx'), 'utf8');
  assert.match(page, /cancel_order_and_restore_stock/);
  assert.match(page, /RestoreCartOnCancel/);
  assert.match(page, /verifyOrderAccess/);

  const restore = await readFile(resolve('components/checkout/RestoreCartOnCancel.tsx'), 'utf8');
  assert.match(restore, /useCart/);
  assert.match(restore, /add\(/);

  const api = await readFile(resolve('app/api/checkout/cancel/route.ts'), 'utf8');
  assert.match(api, /cancel_order_and_restore_stock/);
  assert.match(api, /Not allowed/);
});

test('the checkout button says go to payment and the button rows stay on one line', async () => {
  const form = await readFile(resolve('components/checkout/CheckoutForm.tsx'), 'utf8');
  assert.match(form, /Go to payment/);
  assert.doesNotMatch(form, /Place order · /);
  // No fullWidth inside the button rows — that is what made them wrap.
  assert.doesNotMatch(form, /variant="secondary">Back<\/Button>\s*<Button[^>]*fullWidth/s);

  const coupon = await readFile(resolve('components/checkout/CouponCodeInput.tsx'), 'utf8');
  assert.match(coupon, /flex-nowrap/);
  assert.match(coupon, /shrink-0/);
});
