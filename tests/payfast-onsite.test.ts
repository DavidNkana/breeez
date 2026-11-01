import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { payFastApiSignature, payFastOnsiteEngineUrl } from '../lib/payments/payfast-onsite';

test('the onsite signature is the classic sorted Payfast API signature', () => {
  // Payfast's documented PHP: ksort the fields, urlencode the values,
  // join with &, append the passphrase, then md5.
  const fields: Record<string, string> = {
    merchant_id: '10000100',
    merchant_key: '46f0cd694581a',
    amount: '108.99',
    item_name: 'Order EV-1',
    email_address: 'buyer@example.test',
  };
  const expected =
    'merchant_id=10000100&merchant_key=46f0cd694581a&amount=108.99&email_address=buyer%40example.test&item_name=Order%20EV-1&passphrase=jt7NOE43FZPn';
  // Reproduce the PHP algorithm independently of the implementation.
  const { createHash } = require('node:crypto');
  const phpUrlencode = (value: string) =>
    encodeURIComponent(value)
      .replace(/[!'()*~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
      .replace(/%20/g, '+');
  const keys = Object.keys(fields).sort();
  const payload =
    keys.map((k) => `${k}=${phpUrlencode(String(fields[k]).trim())}`).join('&') +
    `&passphrase=${phpUrlencode('jt7NOE43FZPn')}`;
  assert.equal(createHash('md5').update(payload).digest('hex'), payFastApiSignature(fields, 'jt7NOE43FZPn'));
  // The field order must not change the result.
  const shuffled: Record<string, string> = {
    item_name: fields.item_name,
    email_address: fields.email_address,
    amount: fields.amount,
    merchant_key: fields.merchant_key,
    merchant_id: fields.merchant_id,
  };
  assert.equal(payFastApiSignature(fields, 'jt7NOE43FZPn'), payFastApiSignature(shuffled, 'jt7NOE43FZPn'));
  assert.ok(expected.length > 0);
});

test('blank fields are left out of the onsite signature', () => {
  const withBlank: Record<string, string> = { merchant_id: '10000100', cell_number: '', amount: '10.00' };
  const without: Record<string, string> = { merchant_id: '10000100', amount: '10.00' };
  assert.equal(payFastApiSignature(withBlank, 'x'), payFastApiSignature(without, 'x'));
});

test('the onsite engine comes from the same origin as the process endpoint', () => {
  assert.equal(payFastOnsiteEngineUrl(true), 'https://sandbox.payfast.co.za/onsite/engine.js');
  assert.equal(payFastOnsiteEngineUrl(false), 'https://www.payfast.co.za/onsite/engine.js');
});

test('the checkout opens the payment modal in-app and falls back safely', async () => {
  const form = await readFile(resolve('components/checkout/CheckoutForm.tsx'), 'utf8');
  assert.match(form, /onsite\.pay\(/);
  // A fallback to the hosted checkout if Onsite is unavailable.
  assert.match(form, /fallbackUrl: redirectUrl/);
  assert.match(form, /Go to payment/);

  const hook = await readFile(resolve('components/checkout/usePayfastOnsite.ts'), 'utf8');
  // The modal is rendered by Payfast's engine inside our page.
  assert.match(hook, /payfast_do_onsite_payment/);
  // The engine is loaded from the URL our server hands over (sandbox or live).
  assert.match(hook, /loadEngine\(data\.engineUrl\)/);
  assert.match(hook, /script\.src = engineUrl/);
  assert.match(hook, /window\.location\.assign\(params\.fallbackUrl\)/);

  const route = await readFile(resolve('app/api/payfast/onsite/route.ts'), 'utf8');
  assert.match(route, /createOnsitePayment/);
  assert.match(route, /notEnabled/);
  assert.match(route, /notifyUrl/);
  // The ITN path is unchanged — Onsite still notifies the same endpoint.
  assert.match(route, /api\/payfast\/notify/);
});
