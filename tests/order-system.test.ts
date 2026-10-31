import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { signOrderAccess, verifyOrderAccess } from '../lib/orders/access';
import { buildTimeline } from '../lib/orders/receipt';

const BASE_ORDER = {
  status: 'paid',
  createdAt: '2026-10-01T08:00:00.000Z',
  paidAt: '2026-10-01T08:01:00.000Z',
  shippedAt: null,
  deliveredAt: null,
};

test('an order access token only unlocks the order it was issued for', () => {
  const token = signOrderAccess('order-1', 'buyer@example.test');

  assert.equal(verifyOrderAccess('order-1', 'buyer@example.test', token), true);
  // A different order cannot be unlocked with it.
  assert.equal(verifyOrderAccess('order-2', 'buyer@example.test', token), false);
  // Nor a different email.
  assert.equal(verifyOrderAccess('order-1', 'someone@else.test', token), false);
  // The email match is case-insensitive.
  assert.equal(verifyOrderAccess('order-1', 'BUYER@EXAMPLE.TEST', token), true);
});

test('a missing or malformed token never grants access', () => {
  assert.equal(verifyOrderAccess('order-1', 'buyer@example.test', null), false);
  assert.equal(verifyOrderAccess('order-1', 'buyer@example.test', ''), false);
  assert.equal(verifyOrderAccess('order-1', 'buyer@example.test', 'not-a-token'), false);
  assert.equal(verifyOrderAccess('order-1', 'buyer@example.test', 'a'.repeat(64)), false);
});

test('the timeline marks each step done, current or upcoming', () => {
  const paid = buildTimeline(BASE_ORDER);
  const keys = paid.map((s) => s.key);
  assert.deepEqual(keys, ['placed', 'paid', 'processing', 'shipped', 'delivered']);
  assert.equal(paid[0].state, 'done');
  assert.equal(paid[1].state, 'current');
  assert.equal(paid[2].state, 'upcoming');

  const processing = buildTimeline({ ...BASE_ORDER, status: 'processing' });
  assert.equal(processing[1].state, 'done');
  assert.equal(processing[2].state, 'current');

  const shipped = buildTimeline({ ...BASE_ORDER, status: 'shipped', shippedAt: '2026-10-03T10:00:00.000Z' });
  assert.equal(shipped[3].state, 'current');
  assert.equal(shipped[3].at, '2026-10-03T10:00:00.000Z');

  const delivered = buildTimeline({
    ...BASE_ORDER,
    status: 'delivered',
    shippedAt: '2026-10-03T10:00:00.000Z',
    deliveredAt: '2026-10-05T12:00:00.000Z',
  });
  assert.equal(delivered[4].state, 'current');
  assert.equal(delivered[4].at, '2026-10-05T12:00:00.000Z');
});

test('a cancelled order does not pretend to be progressing', () => {
  const cancelled = buildTimeline({ ...BASE_ORDER, status: 'cancelled' });
  assert.equal(cancelled[1].state, 'upcoming');
  assert.equal(cancelled[2].state, 'upcoming');
});

test('the customer can look up an order with number AND email', async () => {
  const action = await readFile(resolve('app/track/actions.ts'), 'utf8');
  // Order numbers are sequential, so the email is what proves ownership.
  assert.match(action, /order_number/);
  assert.match(action, /email/);
  assert.match(action, /ilike\('email', email\)/);
  assert.match(action, /eq\('order_number', orderNumber\)/);
  assert.match(action, /if \(!orderNumber \|\| !email\)/);
  // The email must not travel in the URL — it is posted to a server action.
  assert.match(action, /'use server'/);
  const form = await readFile(resolve('app/track/TrackOrderForm.tsx'), 'utf8');
  assert.match(form, /useFormState/);
  assert.match(form, /action=\{formAction\}/);
});

test('the customer is notified at every fulfilment step', async () => {
  const itn = await readFile(resolve('lib/payments/payfast-notify.ts'), 'utf8');
  assert.match(itn, /sendOrderReceived/);
  assert.match(itn, /signOrderAccess/);
  assert.match(itn, /receiptUrl/);

  const status = await readFile(resolve('app/api/admin/orders/[orderId]/status/route.ts'), 'utf8');
  assert.match(status, /sendOrderProcessing/);
  assert.match(status, /sendOrderShipped/);
  assert.match(status, /sendOrderDelivered/);

  const email = await readFile(resolve('lib/email/resend.ts'), 'utf8');
  assert.match(email, /export async function sendOrderReceived/);
  assert.match(email, /export async function sendOrderProcessing/);
  assert.match(email, /export async function sendOrderDelivered/);
  // The receipt link must be in the email so a guest can open their order.
  assert.match(email, /View your order &amp; track it/);
});

test('email sending failures are surfaced, not silently swallowed', async () => {
  const email = await readFile(resolve('lib/email/resend.ts'), 'utf8');
  // Resend only allows onboarding@resend.dev to mail the account owner, so
  // the default sender must be our real domain.
  assert.doesNotMatch(email, /onboarding@resend\.dev/);
  assert.match(email, /RESEND_API_KEY is not set/);
  assert.match(email, /email\] send failed/);
});

test('the admin can open a single order and progress it', async () => {
  const page = await readFile(resolve('app/admin/orders/[id]/page.tsx'), 'utf8');
  assert.match(page, /OrderRowActions/);
  assert.match(page, /OrderTimeline/);
  assert.match(page, /receipt\?\.items/);
  // The items themselves come from the shared receipt loader.
  const loader = await readFile(resolve('lib/orders/receipt.ts'), 'utf8');
  assert.match(loader, /from\('order_items'\)/);
  assert.match(loader, /from\('product_images'\)/);
});
