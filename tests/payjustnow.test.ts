import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPayJustNowRequest,
  createPayJustNowCancelRequest,
  createPayJustNowRefundRequest,
  createPayJustNowStatusRequest,
  classifyPayJustNowCancellationStatus,
  getPayJustNowConfig,
  isApprovedPayJustNowAppOrigin,
  isOfficialPayJustNowUrl,
  isPayJustNowConfigured,
  payJustNowSignature,
  validatePayJustNowCallback,
  verifyPayJustNowSignature,
  validatePayJustNowStatus,
} from '../lib/payments/payjustnow';

const env = {
  NODE_ENV: 'test',
  PAYJUSTNOW_ENABLED: 'true',
  PAYJUSTNOW_ENV: 'sandbox',
  PAYJUSTNOW_MERCHANT_ACCOUNT_ID: 'merchant',
  PAYJUSTNOW_SIGNING_SECRET: 'secret',
  PAYJUSTNOW_CANCEL_URL: 'https://www.evasale.co.za/cart',
  PAYJUSTNOW_APP_ORIGIN: 'https://www.evasale.co.za',
} as const;

test('PayJustNow signatures remove all whitespace from outbound and inbound JSON', () => {
  const raw = '{ "status": "PAID", "amount": "108.99" }';
  const signature = payJustNowSignature(raw, 'secret');
  assert.equal(verifyPayJustNowSignature(raw, signature, 'secret'), true);
  assert.equal(verifyPayJustNowSignature('{"status":"PAID","amount":"108.99"}', signature, 'secret'), true);
  const callbackSignature = payJustNowSignature(raw, 'secret');
  assert.equal(verifyPayJustNowSignature('{"status":"PAID","amount":"108.99"}', callbackSignature, 'secret'), true);
  assert.equal(verifyPayJustNowSignature(raw.replace('108.99', '109.99'), signature, 'secret'), false);
});

test('PayJustNow accepts only official hosted checkout destinations, not API hosts', () => {
  assert.equal(isOfficialPayJustNowUrl('https://sandbox.payjustnow.com/api/v2/app/checkout/abc', 'sandbox'), true);
  assert.equal(isOfficialPayJustNowUrl('https://payjustnow.com/api/v2/app/checkout/abc', 'production'), true);
  assert.equal(isOfficialPayJustNowUrl('https://sandbox.payjustnow.com/api/v2/app/checkout/abc/extra', 'sandbox'), false);
  assert.equal(isOfficialPayJustNowUrl('https://sandbox.payjustnow.com/api/v2/checkout/abc', 'sandbox'), false);
  assert.equal(isOfficialPayJustNowUrl('https://api.payjustnow.com/api/v2/app/checkout/abc', 'production'), false);
  assert.equal(isOfficialPayJustNowUrl('https://payjustnow.com/api/v2/app/checkout/abc?next=attacker', 'production'), false);
  assert.equal(isOfficialPayJustNowUrl('https://attacker.example/v2/checkout/abc', 'sandbox'), false);
});

test('PayJustNow callback binds the official status update fields', () => {
  const valid = { checkoutToken: 'token-1', merchantOrderReference: 'TDTD-2026-00001', checkoutPaymentStatus: 'PAID_PENDING_CALLBACK', paymentReference: 'payment-1', checkoutTotalCents: 10899, currency: 'ZAR' };
  const args = { body: valid, expectedOrderNumber: 'TDTD-2026-00001', expectedCurrency: 'ZAR', expectedAmountCents: 10899 };
  assert.equal(validatePayJustNowCallback(args).ok, true);
  for (const change of [{ checkoutPaymentStatus: 'FAILED' }, { merchantOrderReference: 'other' }, { checkoutToken: '' }, { paymentReference: '' }]) {
    assert.equal(validatePayJustNowCallback({ ...args, body: { ...valid, ...change } }).ok, false);
  }
  const missingCurrency = { ...valid };
  delete (missingCurrency as { currency?: string }).currency;
  assert.equal(validatePayJustNowCallback({ ...args, body: missingCurrency }).ok, false);
  assert.equal(validatePayJustNowCallback({ ...args, body: { ...valid, currency: 123 } }).ok, false);
  assert.equal(validatePayJustNowCallback({ ...args, body: { ...valid, currency: 'USD' } }).ok, false);
  assert.equal(validatePayJustNowCallback({ ...args, body: { ...valid, currency: 'ZAR' } }).ok, true);
  assert.equal(validatePayJustNowCallback({ ...args, expectedCurrency: 'USD' }).ok, false);
  assert.equal(validatePayJustNowCallback({ ...args, expectedCurrency: 'zar' }).ok, false);
  assert.equal(validatePayJustNowCallback({ ...args, body: { ...valid, checkoutPaymentStatus: 'PAID' } }).ok, true);
  assert.equal(validatePayJustNowCallback({ ...args, body: { ...valid, checkoutToken: 42, merchantOrderReference: 'TDTD-2026-00001', paymentReference: 456 } }).ok, true);
  assert.equal(validatePayJustNowCallback({ ...args, body: { ...valid, paymentReference: valid.checkoutToken } }).ok, false);
  for (const checkoutTotalCents of [undefined, NaN, Infinity, 10898, 10899.5]) {
    assert.equal(validatePayJustNowCallback({ ...args, body: { ...valid, checkoutTotalCents } }).ok, false);
  }
});

test('PayJustNow config is disabled when credentials are incomplete', () => {
  const config = getPayJustNowConfig(env);
  assert.equal(config.baseUrl, 'https://sandbox-checkout.payjustnow.io/v2');
  assert.equal(getPayJustNowConfig({ ...env, PAYJUSTNOW_ENV: 'production' }).baseUrl, 'https://checkout.payjustnow.io/v2');
  assert.equal(isPayJustNowConfigured(config), true);
  assert.equal(isPayJustNowConfigured(getPayJustNowConfig({ ...env, PAYJUSTNOW_SIGNING_SECRET: '' })), false);
  assert.equal(isPayJustNowConfigured(getPayJustNowConfig({ ...env, PAYJUSTNOW_ENABLED: 'false' })), false);
  assert.equal(isPayJustNowConfigured(getPayJustNowConfig({ ...env, PAYJUSTNOW_APP_ORIGIN: '' })), false);
  assert.equal(isApprovedPayJustNowAppOrigin('https://attacker.example'), false);
  assert.equal(isApprovedPayJustNowAppOrigin('https://www.evasale.co.za'), true);
});

test('PayJustNow request uses the official top-level checkout total and exact shipping address contract', () => {
   const request = createPayJustNowRequest({ orderNumber: 'TDTD-2026-00001', amountCents: 10899, customerEmail: 'buyer@example.test', cancelUrl: env.PAYJUSTNOW_CANCEL_URL, requestId: 'breeez-id', confirmUrl: 'https://shop.test/checkout/success/id', items: [{ name: 'Item', sku: 'SKU', quantity: 1, priceCents: 10899 }], shippingAddress: { addressLine1: '1 Main Street', addressLine2: '', city: 'Cape Town', province: 'Western Cape', postalCode: '8001' } });
  assert.deepEqual(request, {
    requestId: 'breeez-id',
    payjustnow: {
      merchantOrderReference: 'TDTD-2026-00001',
      orderAmountCents: 10899,
      orderItems: [{ name: 'Item', sku: 'SKU', quantity: 1, priceCents: 10899 }],
       customer: { email: 'buyer@example.test' },
       shippingAddress: { addressLine1: '1 Main Street', addressLine2: '', city: 'Cape Town', province: 'Western Cape', postalCode: '8001' },
      confirmRedirectUrl: 'https://shop.test/checkout/success/id',
      cancelRedirectUrl: env.PAYJUSTNOW_CANCEL_URL,
    },
    checkoutTotalCents: 10899,
  });
  assert.equal('merchantOrderReference' in request, false);
  assert.equal('address' in request.payjustnow, false);
  assert.equal('postal_code' in request.payjustnow, false);
});

test('PayJustNow represents nonzero shipping as a labelled synthetic item', () => {
   const params = { orderNumber: 'TDTD-2026-00001', amountCents: 10599, customerEmail: 'buyer@example.test', cancelUrl: env.PAYJUSTNOW_CANCEL_URL, requestId: 'breeez-id', confirmUrl: 'https://shop.test/checkout/success/id', items: [{ name: 'Item', sku: 'SKU', quantity: 1, priceCents: 10499 }] };
  const request = createPayJustNowRequest({ ...params, shippingCents: 100 });
  assert.deepEqual(request.payjustnow.orderItems.at(-1), { name: 'Shipping', sku: 'BREEEZ-SHIPPING', quantity: 1, priceCents: 100 });
  assert.equal(request.payjustnow.orderAmountCents, 10599);
});

test('PayJustNow rejects discounts it cannot safely represent', () => {
   const params = { orderNumber: 'TDTD-2026-00001', amountCents: 10799, customerEmail: 'buyer@example.test', cancelUrl: env.PAYJUSTNOW_CANCEL_URL, requestId: 'breeez-id', confirmUrl: 'https://shop.test/checkout/success/id', items: [{ name: 'Item', sku: 'SKU', quantity: 1, priceCents: 10899 }] };
   assert.throws(() => createPayJustNowRequest({ ...params, discountCents: 100 }), /cannot represent this cart discount/);
});

test('PayJustNow status, cancel, and refund use token-based v2 payloads', () => {
  assert.deepEqual(createPayJustNowStatusRequest('token-1'), { checkoutToken: 'token-1' });
  assert.deepEqual(createPayJustNowCancelRequest('token-1'), { checkoutToken: 'token-1' });
  assert.deepEqual(createPayJustNowRefundRequest({ checkoutToken: 'token-1', requestId: 'refund-1', merchantRefundReference: 'RF-1', refundAmountCents: 10899, refundDescription: 'Refund' }), {
    checkoutToken: 'token-1', requestId: 'refund-1', merchantRefundReference: 'RF-1', refundAmountCents: 10899, refundDescription: 'Refund',
  });
});

test('PayJustNow status validates token, status, and exact amount', async () => {
  assert.equal(validatePayJustNowStatus({ checkoutToken: 'token-1', checkoutPaymentStatus: 'PAID', checkoutTotalCents: '10899', currency: 'ZAR' }, 'token-1', 10899, 'ZAR').ok, true);
  assert.equal(validatePayJustNowStatus({ checkoutToken: 'token-1', checkoutPaymentStatus: 'PAID', checkoutTotalCents: 10900 }, 'token-1', 10899).ok, false);
  assert.equal(validatePayJustNowStatus({ checkoutToken: 'token-1', checkoutPaymentStatus: 'PAID', checkoutTotalCents: 10899, currency: 'USD' }, 'token-1', 10899, 'ZAR').ok, false);
  assert.equal(validatePayJustNowStatus({ checkoutToken: 'token-1', checkoutPaymentStatus: 'PAID', checkoutTotalCents: 10899, checkoutCurrency: 'ZAR' }, 'token-1', 10899, 'ZAR').ok, false);
  assert.equal(validatePayJustNowStatus({ checkoutToken: 'token-1', checkoutPaymentStatus: 'PAID', checkoutTotalCents: 10899 }, 'token-1', 10899).ok, false);
  assert.equal(validatePayJustNowStatus({ checkoutToken: 'token-2', checkoutPaymentStatus: 'PAID', checkoutTotalCents: 10899 }, 'token-1', 10899).ok, false);
  assert.equal(validatePayJustNowStatus({ checkoutToken: 'token-1', checkoutPaymentStatus: 'FAILED', checkoutTotalCents: 10899, currency: 'ZAR' }, 'token-1', 10899).ok, true);
  assert.equal(validatePayJustNowStatus({ checkoutToken: 'token-1', checkoutPaymentStatus: 'PAID', checkoutTotalCents: Infinity }, 'token-1', 10899).ok, false);
});

test('late paid status cannot transition a cancelled order after stock release', async () => {
  const migration = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../supabase/migrations/029_payjustnow_no_cancelled_paid.sql', import.meta.url), 'utf8'));
  assert.match(migration, /status in \('pending_payment', 'cancellation_pending'\)/);
  assert.doesNotMatch(migration, /status in \([^)]*cancelled/);
  assert.match(migration, /Late provider payments remain cancelled/);
});

test('PayJustNow cancellation retries recognize provider success before compensation', () => {
  assert.equal(classifyPayJustNowCancellationStatus('CANCELLED_BY_MERCHANT'), 'confirmed');
  assert.equal(classifyPayJustNowCancellationStatus('PENDING_ORDER'), 'cancellable');
  assert.equal(classifyPayJustNowCancellationStatus('CANCELLED_BY_CONSUMER'), 'cancellable');
  assert.equal(classifyPayJustNowCancellationStatus('PAID'), 'paid');
  assert.equal(classifyPayJustNowCancellationStatus('PENDING'), 'ambiguous');
  assert.equal(classifyPayJustNowCancellationStatus('UNKNOWN_PROVIDER_STATE'), 'ambiguous');
});
