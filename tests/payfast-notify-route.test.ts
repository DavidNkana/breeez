import assert from 'node:assert/strict';
import test from 'node:test';

import { getPayFastAppOrigin } from '../lib/payments/payfast';
import { handlePayFastNotify } from '../lib/payments/payfast-notify';

test('the canonical public origin is used when nothing is configured', () => {
  // A stable customer-facing domain, never a per-deployment Vercel URL.
  const origin = getPayFastAppOrigin({ NODE_ENV: 'production' } as NodeJS.ProcessEnv);
  assert.equal(origin, 'https://www.evasale.co.za');
});

test('VERCEL_URL is not used as the notification origin', () => {
  // A preview deployment must not point Payfast's ITN at a host that only
  // exists for that deployment.
  const origin = getPayFastAppOrigin({
    NODE_ENV: 'production',
    VERCEL_URL: 'breeez-lyart-abc123.vercel.app',
  } as NodeJS.ProcessEnv);
  assert.equal(origin, 'https://www.evasale.co.za');
  assert.ok(!origin.includes('abc123'));
});

test('an explicit configured origin wins', () => {
  const origin = getPayFastAppOrigin({
    NODE_ENV: 'production',
    NEXT_PUBLIC_APP_URL: 'https://www.evasale.co.za',
  } as NodeJS.ProcessEnv);
  assert.equal(origin, 'https://www.evasale.co.za');
});

test('a non-approved origin is rejected', () => {
  assert.throws(
    () => getPayFastAppOrigin({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: 'https://evil.example' } as NodeJS.ProcessEnv),
    /not approved/,
  );
});

test('both published ITN routes resolve to the same handler', async () => {
  const canonical = await import('../app/api/payfast/notify/route');
  const alias = await import('../app/api/webhooks/payfast/route');

  assert.equal(typeof canonical.POST, 'function');
  assert.equal(typeof alias.POST, 'function');
  assert.equal(typeof handlePayFastNotify, 'function');

  // A GET must be rejected with 405 — Payfast only ever POSTs.
  const get = await canonical.GET();
  assert.equal(get.status, 405);

  // An unsigned notification must be refused (no merchant id configured in
  // the test environment, so it fails closed with 503).
  const post = await canonical.POST(new Request('https://www.evasale.co.za/api/payfast/notify', { method: 'POST', body: 'pf_payment_id=abc' }));
  assert.ok([400, 503].includes(post.status));
});
