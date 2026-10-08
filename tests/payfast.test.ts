import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPayFastFields, getPayFastAppOrigin, payFastSignature, validatePayFastNotification } from '../lib/payments/payfast';

function notification(amount = '108.99') {
  const fields = new Map<string, string>([
    ['merchant_id', '10000100'], ['payment_status', 'COMPLETE'], ['pf_payment_id', '98765'],
    ['amount_gross', amount], ['custom_str1', 'order-id'], ['custom_str2', 'EV-1'], ['currency', 'ZAR'],
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

test('PayFast requires ZAR and the stored order currency', () => {
  const args = { passphrase: 'secret', merchantId: '10000100', expectedAmountCents: 10899, expectedCurrency: 'ZAR' };
  const missing = notification();
  missing.fields.delete('currency');
  assert.equal(validatePayFastNotification({ ...missing, ...args }).ok, false);

  const wrong = notification();
  wrong.fields.set('currency', 'USD');
  wrong.signature = payFastSignature([...wrong.fields.entries()], 'secret');
  assert.equal(validatePayFastNotification({ ...wrong, ...args }).ok, false);

  assert.equal(validatePayFastNotification({ ...notification(), ...args }).ok, true);
});

test('PayFast callback origin is restricted to Evasale, Vercel, or local test origins', () => {
  assert.equal(getPayFastAppOrigin({ NODE_ENV: 'production' }), 'https://www.evasale.co.za');
  assert.equal(getPayFastAppOrigin({ NODE_ENV: 'production', VERCEL_URL: 'evasale.vercel.app' }), 'https://evasale.vercel.app');
  assert.equal(getPayFastAppOrigin({ NODE_ENV: 'development', APP_URL: 'http://localhost:3000' }), 'http://localhost:3000');
  assert.throws(() => getPayFastAppOrigin({ NODE_ENV: 'production', APP_URL: 'https://attacker.example' }));
});

test('PayFast fields bind the order identity and callback URL', () => {
  const fields = buildPayFastFields({ merchantId: 'm', merchantKey: 'k', orderId: 'id', orderNumber: 'EV-1', amountCents: 1000, customerEmail: 'a@b.test', returnUrl: 'https://www.evasale.co.za/ok', cancelUrl: 'https://www.evasale.co.za/cart', notifyUrl: 'https://www.evasale.co.za/api/webhooks/payfast' });
  assert.equal(fields.custom_str1, 'id');
  assert.equal(fields.notify_url, 'https://www.evasale.co.za/api/webhooks/payfast');
  assert.equal(fields.currency, 'ZAR');
});
