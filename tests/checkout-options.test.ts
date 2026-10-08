import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getAllShippingOptions, calculateShippingCents } from '../lib/shipping';

test('checkout exposes only The Courier Guy at the existing flat rate', () => {
  const options = getAllShippingOptions('8001');
  assert.deepEqual(options.map((option) => option.method), ['tcg_door']);
  assert.equal(options[0].label, 'Door Delivery (The Courier Guy)');
  assert.equal(calculateShippingCents('tcg_door', 10000), 8900);
  assert.doesNotMatch(JSON.stringify(options), /Pargo|Dawn Wing/i);
});

test('checkout payment display has PayFast and a disabled PayJustNow option only', async () => {
  const checkout = await readFile(resolve('components/checkout/CheckoutForm.tsx'), 'utf8');
  assert.match(checkout, /id: 'payfast'/);
  assert.match(checkout, /id: 'payjustnow'/);
  assert.match(checkout, /planned: true/);
  assert.doesNotMatch(checkout, /payjustnow\.com\/wp-content/);
  assert.doesNotMatch(checkout, /id: '(?:yoco|ozow|apple_pay|paypal)'/);
});

test('payment display keeps PayFast official and PayJustNow neutral until approved', async () => {
  const strip = await readFile(resolve('components/checkout/PaymentMethodsStrip.tsx'), 'utf8');
  assert.match(strip, /https:\/\/payfast\.io\/wp-content\/uploads\/2024\/12\/Payfast-logo\.svg/);
  assert.match(strip, /alt: 'PayFast payment logo'/);
  assert.match(strip, /PayJustNow/);
  assert.match(strip, /Coming soon/);
  assert.doesNotMatch(strip, /payjustnow\.com\/wp-content/);
});

test('server checkout rejects inactive courier and payment identifiers', async () => {
  const route = await readFile(resolve('app/api/checkout/create-payment/route.ts'), 'utf8');
  assert.match(route, /shippingMethod !== 'tcg_door'/);
  assert.match(route, /paymentMethod !== 'payfast'/);
  assert.doesNotMatch(route, /pargo_pickup|dawn_wing_metro/);
});
