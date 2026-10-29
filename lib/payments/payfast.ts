import { createHash, timingSafeEqual } from 'node:crypto';

export type PayFastFields = Record<string, string | number>;

function encoded(fields: Array<[string, string | number]>, passphrase?: string): string {
  const values = fields.map(([key, value]) => `${key}=${encodeURIComponent(String(value).trim())}`);
  if (passphrase) values.push(`passphrase=${encodeURIComponent(passphrase.trim())}`);
  return values.join('&');
}

export function payFastSignature(fields: Array<[string, string | number]>, passphrase?: string): string {
  return createHash('md5').update(encoded(fields, passphrase)).digest('hex');
}

export function verifyPayFastSignature(
  fields: Array<[string, string]>,
  receivedSignature: string,
  passphrase?: string,
): boolean {
  if (!receivedSignature || !/^[a-f0-9]{32}$/i.test(receivedSignature)) return false;
  const expected = payFastSignature(fields, passphrase);
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
  if (!verifyPayFastSignature(entries.filter(([key]) => key !== 'signature'), params.signature, params.passphrase)) {
    return { ok: false, error: 'Invalid signature' };
  }
  const merchantId = params.fields.get('merchant_id');
  const paymentId = params.fields.get('pf_payment_id');
  const orderId = params.fields.get('custom_str1');
  const amount = params.fields.get('amount_gross') || '';
  if (merchantId !== params.merchantId || params.fields.get('payment_status') !== 'COMPLETE' || !paymentId || !orderId) {
    return { ok: false, error: 'Invalid payment identity or status' };
  }
  if (params.fields.get('currency') !== 'ZAR' || params.fields.get('currency') !== params.expectedCurrency) {
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
  return {
    merchant_id: params.merchantId,
    merchant_key: params.merchantKey,
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl,
    notify_url: params.notifyUrl,
    name: 'Evasale',
    item_name: `Order ${params.orderNumber}`,
    item_description: `Evasale order ${params.orderNumber}`,
    amount: (params.amountCents / 100).toFixed(2),
    currency: 'ZAR',
    email: params.customerEmail,
    custom_str1: params.orderId,
    custom_str2: params.orderNumber,
  };
}
