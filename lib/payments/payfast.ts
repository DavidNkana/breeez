import { createHash, timingSafeEqual } from 'node:crypto';

export type PayFastFields = Record<string, string | number>;

/**
 * Payfast's canonical checkout field order.
 *
 * Payfast's published signature rule for the checkout form is explicit:
 *
 *   "The pairs must be listed in the order in which they appear in the
 *    attributes description... Do not use the API signature format, which uses
 *    alphabetical ordering!"
 *
 * So the signature is built over the fields in THIS order, not alphabetical
 * order and not the order the code happens to build the object in. Payfast
 * recomputes the signature this way when it verifies the request, so a
 * mismatch here means the payment is rejected outright.
 */
export const PAYFAST_FIELD_ORDER = [
  // Merchant details
  'merchant_id',
  'merchant_key',
  'return_url',
  'cancel_url',
  'notify_url',
  'fica_idnumber',
  // Buyer details
  'name_first',
  'name_last',
  'email_address',
  'cell_number',
  // Transaction details
  'm_payment_id',
  'amount',
  'item_name',
  'item_description',
  'custom_int1',
  'custom_int2',
  'custom_int3',
  'custom_int4',
  'custom_int5',
  'custom_str1',
  'custom_str2',
  'custom_str3',
  'custom_str4',
  'custom_str5',
  // Transaction options
  'email_confirmation',
  'confirmation_address',
  // Payment methods
  'payment_method',
] as const;

/**
 * PHP's urlencode(), which is what Payfast uses when it signs.
 *
 * `encodeURIComponent` differs in two ways that matter:
 *   - it leaves `! * ' ( )` unescaped, urlencode escapes them
 *   - it encodes a space as `%20`, urlencode encodes it as `+`
 */
export function payFastUrlEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*~]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+');
}

/** The signed parameter string for a set of checkout fields. */
function checkoutParamString(fields: Array<[string, string | number]>): string {
  const byKey = new Map(fields.map(([key, value]) => [key, value]));
  const parts: string[] = [];
  for (const key of PAYFAST_FIELD_ORDER) {
    if (!byKey.has(key)) continue;
    const value = String(byKey.get(key)).trim();
    // Payfast signs "all the non-blank variables".
    if (value === '') continue;
    parts.push(`${key}=${payFastUrlEncode(value)}`);
  }
  // Any field not in the canonical list still has to be signed.
  for (const [key, value] of fields) {
    if ((PAYFAST_FIELD_ORDER as readonly string[]).includes(key)) continue;
    const trimmed = String(value).trim();
    if (trimmed === '') continue;
    parts.push(`${key}=${payFastUrlEncode(trimmed)}`);
  }
  return parts.join('&');
}

/**
 * The signed parameter string for an incoming ITN.
 *
 * Payfast signs the notification with the fields in the order it posted
 * them, stopping at `signature`:
 *
 *   foreach( $pfData as $key => $val ) {
 *       if( $key !== 'signature' ) { $pfParamString .= $key .'='. urlencode( $val ) .'&'; }
 *       else { break; }
 *   }
 *
 * Note there is NO sorting here, and no trimming — the values arrive already
 * decoded from the form body.
 */
function notificationParamString(entries: Array<[string, string]>): string {
  const parts: string[] = [];
  for (const [key, value] of entries) {
    if (key === 'signature') break;
    parts.push(`${key}=${payFastUrlEncode(value)}`);
  }
  return parts.join('&');
}

function withPassphrase(paramString: string, passphrase?: string): string {
  if (!passphrase) return paramString;
  return `${paramString}&passphrase=${payFastUrlEncode(passphrase.trim())}`;
}

/** Signature for a checkout request (canonical field order). */
export function payFastSignature(fields: Array<[string, string | number]>, passphrase?: string): string {
  return createHash('md5').update(withPassphrase(checkoutParamString(fields), passphrase)).digest('hex');
}

/** Signature for an incoming notification (posted order, stops at `signature`). */
export function payFastNotificationSignature(entries: Array<[string, string]>, passphrase?: string): string {
  return createHash('md5').update(withPassphrase(notificationParamString(entries), passphrase)).digest('hex');
}

export function verifyPayFastSignature(
  fields: Array<[string, string]>,
  receivedSignature: string,
  passphrase?: string,
): boolean {
  if (!receivedSignature || !/^[a-f0-9]{32}$/i.test(receivedSignature)) return false;
  const expected = payFastNotificationSignature(fields, passphrase);
  return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(receivedSignature.toLowerCase(), 'utf8'));
}

export function validatePayFastNotification(params: {
  fields: Map<string, string>;
  signature: string;
  passphrase?: string;
  merchantId: string;
  expectedAmountCents: number;
  expectedCurrency: string;
}): { ok: true; paymentId: string; orderId: string; amountCents: number } | { ok: false; error: string } {
  const entries = [...params.fields.entries()];
  // The raw entries (including `signature`) are passed through so the
  // signature is rebuilt in the exact order Payfast posted them, stopping at
  // `signature` — that is what Payfast itself signs.
  if (!verifyPayFastSignature(entries, params.signature, params.passphrase)) {
    return { ok: false, error: 'Invalid signature' };
  }
  const merchantId = params.fields.get('merchant_id');
  const paymentId = params.fields.get('pf_payment_id');
  const orderId = params.fields.get('custom_str1');
  const amount = params.fields.get('amount_gross') || '';
  if (merchantId !== params.merchantId || params.fields.get('payment_status') !== 'COMPLETE' || !paymentId || !orderId) {
    return { ok: false, error: 'Invalid payment identity or status' };
  }
  // Payfast's published ITN carries no currency field for a ZAR account, so
  // a missing currency must NOT reject the notification — the exact
  // amount_gross match below is the real protection. If a currency IS
  // present, it has to match the order.
  const notifiedCurrency = params.fields.get('pf_currency') || params.fields.get('currency');
  if (notifiedCurrency && notifiedCurrency !== params.expectedCurrency) {
    return { ok: false, error: 'Currency mismatch' };
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) return { ok: false, error: 'Invalid payment amount' };
  const [whole, decimals = ''] = amount.split('.');
  const amountCents = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  if (!Number.isSafeInteger(amountCents) || amountCents !== params.expectedAmountCents) {
    return { ok: false, error: 'Amount mismatch' };
  }
  return { ok: true, paymentId, orderId, amountCents };
}

export function getPayFastAppOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.NEXT_PUBLIC_APP_URL || env.APP_URL;
  // Deliberately NOT falling back to VERCEL_URL: that is a per-deployment
  // host, so a preview build would point Payfast's ITN at a URL that only
  // exists for that one deployment (and dies with it). The notification URL
  // must be the stable customer-facing domain.
  const candidate = configured || 'https://www.evasale.co.za';
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('A valid PayFast app origin is required.');
  }
  const host = url.hostname.toLowerCase();
  const local = (host === 'localhost' || host === '127.0.0.1') && ['development', 'test'].includes(env.NODE_ENV || '');
  const vercelHost = host.endsWith('.vercel.app');
  if (url.protocol !== 'https:' && !local) throw new Error('PayFast app origin must use HTTPS.');
  if (host !== 'www.evasale.co.za' && !vercelHost && !local) {
    throw new Error('PayFast app origin is not approved.');
  }
  return url.origin;
}

export function buildPayFastFields(params: {
  merchantId: string;
  merchantKey: string;
  orderId: string;
  orderNumber: string;
  amountCents: number;
  customerEmail: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}): PayFastFields {
  // Field names below follow Payfast's published checkout specification
  // (developers.payfast.co.za). Two mistakes were fixed here:
  //   - the customer email field is `email_address`, NOT `email` — sending
  //     `email` means Payfast never receives the customer's address, so no
  //     receipt reaches them.
  //   - there is no `name` field and no `currency` field in the spec. Sending
  //     `name` was meaningless; `currency` was actively harmful because the
  //     ITN does not carry it back, so a validator that required it would
  //     reject every genuine payment notification.
  //
  // `confirmation_address` makes the customer the recipient of the Payfast
  // receipt (by default it goes to the address configured on the account).
  // `email_confirmation` additionally sends the merchant a copy.
  //
  // The KEYS ARE IN PAYFAST'S CANONICAL ORDER on purpose — the signature is
  // computed over this order and Payfast verifies it the same way.
  return {
    merchant_id: params.merchantId,
    merchant_key: params.merchantKey,
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl,
    notify_url: params.notifyUrl,
    email_address: params.customerEmail,
    amount: (params.amountCents / 100).toFixed(2),
    item_name: `Order ${params.orderNumber}`,
    item_description: `Evasale order ${params.orderNumber}`,
    custom_str1: params.orderId,
    custom_str2: params.orderNumber,
    email_confirmation: 1,
    confirmation_address: params.customerEmail,
  };
}
