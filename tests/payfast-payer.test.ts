import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { buildPayFastFields, normaliseCellNumber, splitCustomerName } from '../lib/payments/payfast';

const BASE = {
  merchantId: '10000100',
  merchantKey: 'key',
  orderId: 'order-id',
  orderNumber: 'EV-1',
  amountCents: 10899,
  customerEmail: 'buyer@example.test',
  returnUrl: 'https://www.evasale.co.za/ok',
  cancelUrl: 'https://www.evasale.co.za/cart',
  notifyUrl: 'https://www.evasale.co.za/api/payfast/notify',
};

test('the payer identity is normalised for Payfast', () => {
  assert.equal(normaliseCellNumber('082 123 4567'), '0821234567');
  assert.equal(normaliseCellNumber('0821234567'), '0821234567');
  assert.equal(normaliseCellNumber('+27 82 123 4567'), '0821234567');
  assert.equal(normaliseCellNumber('27821234567'), '0821234567');
  assert.equal(normaliseCellNumber('(082) 123-4567'), '0821234567');
  assert.equal(normaliseCellNumber(''), '');
  assert.equal(normaliseCellNumber('not a number'), '');

  assert.deepEqual(splitCustomerName('Thandi Mokoena'), { first: 'Thandi', last: 'Mokoena' });
  assert.deepEqual(splitCustomerName('  Thandi   Mokoena  '), { first: 'Thandi', last: 'Mokoena' });
  assert.deepEqual(splitCustomerName('Cher'), { first: 'Cher', last: '' });
  assert.deepEqual(splitCustomerName(''), { first: '', last: '' });
});

test('the payer name and mobile are sent to Payfast', () => {
  const fields = buildPayFastFields({
    ...BASE,
    customerName: 'Thandi Mokoena',
    customerPhone: '+27 82 123 4567',
  });

  assert.equal(fields.name_first, 'Thandi');
  assert.equal(fields.name_last, 'Mokoena');
  assert.equal(fields.cell_number, '0821234567');
  assert.equal(fields.email_address, 'buyer@example.test');
});

test('an unknown name or phone is omitted rather than sent blank', () => {
  const fields = buildPayFastFields(BASE);
  assert.equal(fields.name_first, undefined);
  assert.equal(fields.name_last, undefined);
  assert.equal(fields.cell_number, undefined);
});

test('the payer fields keep Payfast canonical order', () => {
  const fields = buildPayFastFields({
    ...BASE,
    customerName: 'Thandi Mokoena',
    customerPhone: '0821234567',
  });
  const order = [
    'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
    'name_first', 'name_last', 'email_address', 'cell_number', 'amount',
    'item_name', 'item_description', 'custom_str1', 'custom_str2',
    'email_confirmation', 'confirmation_address',
  ];
  assert.deepEqual(Object.keys(fields), order);
});

test('the checkout sends the customer name and mobile to the server', async () => {
  const form = await readFile(resolve('components/checkout/CheckoutForm.tsx'), 'utf8');
  assert.match(form, /fullName,/);
  assert.match(form, /phone,/);

  const route = await readFile(resolve('app/api/checkout/create-payment/route.ts'), 'utf8');
  // The server must actually use them, not just receive them.
  assert.match(route, /customerName = String\(fullName\)\.trim\(\)/);
  assert.match(route, /customerPhone = String\(phone\)\.trim\(\)/);
  // Name and mobile travel with the order so the courier can deliver.
  assert.match(route, /shipping_address: \{[\s\S]{0,200}name: customerName,[\s\S]{0,120}phone: customerPhone/);
  // And they are passed to the payment provider to identify the payer.
  assert.match(route, /customerEmail: email, customerName, customerPhone, method: paymentMethod/);
  // The courier also needs to know which door to knock on.
  assert.match(route, /delivery_building_type: building/);
  assert.match(route, /delivery_instructions:/);
  assert.match(route, /door_address_confirmed: true/);
});

test('the native app keeps the payment flow in the app', async () => {
  const capacitor = await readFile(resolve('capacitor.config.ts'), 'utf8');
  // The app must run on the same origin as the website, otherwise the Payfast
  // return URL sends the customer out of the app into a browser.
  assert.match(capacitor, /url: 'https:\/\/www\.evasale\.co\.za'/);
  // With this true, iOS blocks the hosted checkout from loading at all.
  assert.match(capacitor, /limitsNavigationsToAppBoundDomains: false/);

  const chrome = await readFile(resolve('components/app/NativeChrome.tsx'), 'utf8');
  // window.open must navigate in the same webview, not the external browser.
  assert.match(chrome, /window\.open = /);
  assert.match(chrome, /window\.location\.assign\(href\)/);
});
