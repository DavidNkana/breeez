import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPayFastFields, getPayFastAppOrigin, payFastSignature, validatePayFastNotification } from '../lib/payments/payfast';

function notification(amount = '108.99') {
  // Shaped like a real Payfast ITN for a ZAR account: no `currency` field is
  // returned, so the validator must not depend on one.
  const fields = new Map<string, string>([
    ['merchant_id', '10000100'], ['payment_status', 'COMPLETE'], ['pf_payment_id', '98765'],
    ['amount_gross', amount], ['custom_str1', 'order-id'], ['custom_str2', 'EV-1'],
    ['m_payment_id', 'EV-1'], ['email_address', 'buyer@example.test'],
  ]);
  const signature = payFastSignature([...fields.entries()], 'secret');
  return { fields, signature };
}

test('PayFast rejects bad signatures, statuses, identities, and amounts', () => {
  const valid = notification();
  const args = { passphrase: 'secret', merchantId: '10000100', expectedAmountCents: 10899, expectedCurrency: 'ZAR' };
  assert.equal(validatePayFastNotification({ ...valid, ...args }).ok, true);
  assert.equal(validatePayFastNotification({ ...valid, signature: '0'.repeat(32), ...args }).ok, false);
  valid.fields.set('payment_status', 'FAILED');
  assert.equal(validatePayFastNotification({ ...valid, ...args }).ok, false);
  const wrongAmount = notification('109.00');
  assert.equal(validatePayFastNotification({ ...wrongAmount, ...args }).ok, false);
});

test('a genuine ITN without a currency field is accepted', () => {
  const args = { passphrase: 'secret', merchantId: '10000100', expectedAmountCents: 10899, expectedCurrency: 'ZAR' };

  // Payfast does not return a currency field for a ZAR account. Requiring one
  // would reject every real notification and leave paid orders unfulfilled.
  const noCurrency = notification();
  noCurrency.fields.delete('currency');
  assert.equal(noCurrency.fields.has('currency'), false);
  assert.equal(validatePayFastNotification({ ...noCurrency, ...args }).ok, true);

  // If a currency IS present it has to match the order.
  const wrong = notification();
  wrong.fields.set('currency', 'USD');
  wrong.signature = payFastSignature([...wrong.fields.entries()], 'secret');
  assert.equal(validatePayFastNotification({ ...wrong, ...args }).ok, false);

  const right = notification();
  right.fields.set('currency', 'ZAR');
  right.signature = payFastSignature([...right.fields.entries()], 'secret');
  assert.equal(validatePayFastNotification({ ...right, ...args }).ok, true);
});

test('checkout fields use Payfast\'s published names', () => {
  const fields = buildPayFastFields({
    merchantId: '10000100', merchantKey: 'key', orderId: 'order-id', orderNumber: 'EV-1',
    amountCents: 10899, customerEmail: 'buyer@example.test',
    returnUrl: 'https://www.evasale.co.za/ok', cancelUrl: 'https://www.evasale.co.za/cart',
    notifyUrl: 'https://www.evasale.co.za/api/payfast/notify',
  });

  // The customer email field is `email_address` — `email` is not a Payfast field.
  assert.equal(fields.email_address, 'buyer@example.test');
  assert.equal(fields.email, undefined);
  // The customer must receive the Payfast receipt.
  assert.equal(fields.confirmation_address, 'buyer@example.test');
  assert.equal(fields.email_confirmation, 1);
  // `name` and `currency` are not Payfast fields.
  assert.equal(fields.name, undefined);
  assert.equal(fields.currency, undefined);
  // Documented required fields.
  assert.equal(fields.merchant_id, '10000100');
  assert.equal(fields.item_name, 'Order EV-1');
  assert.equal(fields.amount, '108.99');
  assert.equal(fields.custom_str1, 'order-id');
  assert.equal(fields.notify_url, 'https://www.evasale.co.za/api/payfast/notify');
});

test('no single payment method is locked, so every enabled method shows', () => {
  const fields = buildPayFastFields({
    merchantId: '10000100', merchantKey: 'key', orderId: 'order-id', orderNumber: 'EV-1',
    amountCents: 10899, customerEmail: 'buyer@example.test',
    returnUrl: 'https://www.evasale.co.za/ok', cancelUrl: 'https://www.evasale.co.za/cart',
    notifyUrl: 'https://www.evasale.co.za/api/payfast/notify',
  });
  // `payment_method` omitted => Payfast shows all methods enabled on the account.
  assert.equal(fields.payment_method, undefined);
});

test('PayFast callback origin is restricted to Evasale, Vercel, or local test origins', () => {
  assert.equal(getPayFastAppOrigin({ NODE_ENV: 'production' }), 'https://www.evasale.co.za');
  // VERCEL_URL is deliberately ignored: it is a per-deployment host, so a
  // preview build would point Payfast's ITN at a URL that only exists for
  // that one deployment. The canonical domain is used instead.
  assert.equal(getPayFastAppOrigin({ NODE_ENV: 'production', VERCEL_URL: 'evasale.vercel.app' }), 'https://www.evasale.co.za');
  assert.equal(getPayFastAppOrigin({ NODE_ENV: 'development', APP_URL: 'http://localhost:3000' }), 'http://localhost:3000');
  assert.throws(() => getPayFastAppOrigin({ NODE_ENV: 'production', APP_URL: 'https://attacker.example' }));
});

test('PayFast fields bind the order identity and callback URL', () => {
  const fields = buildPayFastFields({ merchantId: 'm', merchantKey: 'k', orderId: 'id', orderNumber: 'EV-1', amountCents: 1000, customerEmail: 'a@b.test', returnUrl: 'https://www.evasale.co.za/ok', cancelUrl: 'https://www.evasale.co.za/cart', notifyUrl: 'https://www.evasale.co.za/api/payfast/notify' });
  assert.equal(fields.custom_str1, 'id');
  assert.equal(fields.notify_url, 'https://www.evasale.co.za/api/payfast/notify');
  assert.equal(fields.email_address, 'a@b.test');
});
