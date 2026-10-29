import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';

import {
  PAYFAST_FIELD_ORDER,
  buildPayFastFields,
  payFastNotificationSignature,
  payFastSignature,
  payFastUrlEncode,
  verifyPayFastSignature,
} from '../lib/payments/payfast';

/**
 * Independent transcription of Payfast's own PHP examples, used as the
 * reference implementation. These deliberately do NOT import the helpers
 * under test, so a mistake in our implementation cannot hide behind a
 * matching mistake in the test.
 *
 * Checkout (Step 2 of Payfast's docs):
 *   foreach( $data as $key => $val ) {
 *       if($val !== '') { $pfOutput .= $key .'='. urlencode( trim( $val ) ) .'&'; }
 *   }
 *   $getString = substr( $pfOutput, 0, -1 );
 *   if( $passPhrase !== null ) { $getString .= '&passphrase='. urlencode( trim( $passPhrase ) ); }
 *   return md5( $getString );
 */
function phpUrlencode(value: string): string {
  let out = '';
  for (const byte of Buffer.from(value, 'utf8')) {
    const char = String.fromCharCode(byte);
    if (/[A-Za-z0-9\-_.]/.test(char)) {
      out += char;
    } else if (char === ' ') {
      out += '+';
    } else {
      out += `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
    }
  }
  return out;
}

/** Payfast's checkout signature, in Payfast's canonical field order. */
function phpCheckoutSignature(
  data: Array<[string, string]>,
  passphrase: string | null,
  order: readonly string[],
): string {
  const byKey = new Map(data);
  const parts: string[] = [];
  for (const key of order) {
    if (!byKey.has(key)) continue;
    const value = byKey.get(key)!;
    if (value.trim() === '') continue;
    parts.push(`${key}=${phpUrlencode(value.trim())}`);
  }
  let out = parts.join('&');
  if (passphrase !== null) out += `&passphrase=${phpUrlencode(passphrase.trim())}`;
  return createHash('md5').update(out).digest('hex');
}

/** Payfast's ITN verification string: posted order, stopping at `signature`. */
function phpNotificationSignature(
  entries: Array<[string, string]>,
  passphrase: string | null,
): string {
  const parts: string[] = [];
  for (const [key, value] of entries) {
    if (key === 'signature') break;
    parts.push(`${key}=${phpUrlencode(value)}`);
  }
  let out = parts.join('&');
  if (passphrase !== null) out += `&passphrase=${phpUrlencode(passphrase.trim())}`;
  return createHash('md5').update(out).digest('hex');
}

const CHECKOUT_FIELDS: Array<[string, string]> = [
  ['merchant_id', '10000100'],
  ['merchant_key', '46f0cd694581a'],
  ['return_url', 'https://www.evasale.co.za/checkout/success/order-id?ref=EV-1'],
  ['cancel_url', 'https://www.evasale.co.za/cart'],
  ['notify_url', 'https://www.evasale.co.za/api/payfast/notify'],
  ['email_address', 'buyer@example.test'],
  ['amount', '108.99'],
  ['item_name', 'Order EV-1'],
  ['item_description', 'Evasale order EV-1'],
  ['custom_str1', 'order-id'],
  ['custom_str2', 'EV-1'],
  ['email_confirmation', '1'],
  ['confirmation_address', 'buyer@example.test'],
];

test('url encoding matches PHP urlencode', () => {
  assert.equal(payFastUrlEncode('test product'), 'test+product');
  assert.equal(payFastUrlEncode('https://www.evasale.co.za/a?b=1&c=2'), 'https%3A%2F%2Fwww.evasale.co.za%2Fa%3Fb%3D1%26c%3D2');
  assert.equal(payFastUrlEncode("O'Brien (Ltd)!"), 'O%27Brien%20%28Ltd%29%21'.replace(/%20/g, '+'));
  // Uppercase hex, as Payfast requires.
  assert.equal(payFastUrlEncode('~'), '%7E');
});

test('the checkout signature matches Payfast\'s documented algorithm', () => {
  const expected = phpCheckoutSignature(CHECKOUT_FIELDS, 'jt7NOE43FZPn', PAYFAST_FIELD_ORDER);
  const actual = payFastSignature(CHECKOUT_FIELDS, 'jt7NOE43FZPn');
  assert.equal(actual, expected);
});

test('the checkout signature does not depend on the order fields are supplied in', () => {
  const shuffled = [...CHECKOUT_FIELDS].reverse();
  assert.equal(
    payFastSignature(shuffled, 'jt7NOE43FZPn'),
    payFastSignature(CHECKOUT_FIELDS, 'jt7NOE43FZPn'),
  );
});

test('the notification signature matches Payfast\'s documented algorithm', () => {
  const posted: Array<[string, string]> = [
    ['m_payment_id', 'EV-1'],
    ['pf_payment_id', '1089250'],
    ['payment_status', 'COMPLETE'],
    ['item_name', 'Order EV-1'],
    ['item_description', 'Evasale order EV-1'],
    ['amount_gross', '108.99'],
    ['amount_fee', '-2.20'],
    ['amount_net', '106.79'],
    ['custom_str1', 'order-id'],
    ['custom_str2', 'EV-1'],
    ['email_address', 'buyer@example.test'],
    ['merchant_id', '10000100'],
    ['signature', 'PLACEHOLDER'],
  ];

  const expected = phpNotificationSignature(posted, 'jt7NOE43FZPn');
  const actual = payFastNotificationSignature(posted, 'jt7NOE43FZPn');
  assert.equal(actual, expected);

  // And the verifier accepts it.
  const withSignature: Array<[string, string]> = posted.map(([k, v]) => [k, k === 'signature' ? actual : v]);
  assert.equal(verifyPayFastSignature(withSignature, actual, 'jt7NOE43FZPn'), true);
  assert.equal(verifyPayFastSignature(withSignature, '0'.repeat(32), 'jt7NOE43FZPn'), false);
});

test('the notification signature uses posted order, not alphabetical order', () => {
  // If the implementation sorted alphabetically it would produce a different
  // (wrong) signature, because Payfast signs in the order it posted.
  const posted: Array<[string, string]> = [
    ['m_payment_id', 'EV-1'],
    ['pf_payment_id', '1089250'],
    ['payment_status', 'COMPLETE'],
    ['merchant_id', '10000100'],
    ['signature', 'PLACEHOLDER'],
  ];
  const alphabetical = [...posted].sort(([a], [b]) => a.localeCompare(b));
  assert.notEqual(
    payFastNotificationSignature(posted, 'secret'),
    payFastNotificationSignature(alphabetical, 'secret'),
  );
  // The posted order matches Payfast's reference implementation.
  assert.equal(
    payFastNotificationSignature(posted, 'secret'),
    phpNotificationSignature(posted, 'secret'),
  );
});

test('built checkout fields are emitted in Payfast canonical order', () => {
  const fields = buildPayFastFields({
    merchantId: '10000100', merchantKey: 'key', orderId: 'order-id', orderNumber: 'EV-1',
    amountCents: 10899, customerEmail: 'buyer@example.test',
    returnUrl: 'https://www.evasale.co.za/ok', cancelUrl: 'https://www.evasale.co.za/cart',
    notifyUrl: 'https://www.evasale.co.za/api/payfast/notify',
  });

  const keys = Object.keys(fields);
  const positions = keys.map((key) => PAYFAST_FIELD_ORDER.indexOf(key as never));
  assert.ok(positions.every((position) => position >= 0), 'every field must be a known Payfast field');
  // Strictly increasing => canonical order.
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));

  // And the signature computed from the built fields matches the reference.
  const asEntries = keys.map((key) => [key, String(fields[key])] as [string, string]);
  assert.equal(
    payFastSignature(asEntries, 'jt7NOE43FZPn'),
    phpCheckoutSignature(asEntries, 'jt7NOE43FZPn', PAYFAST_FIELD_ORDER),
  );
});
