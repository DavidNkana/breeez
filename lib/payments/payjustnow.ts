import { createHmac, timingSafeEqual } from 'node:crypto';

export type PayJustNowEnvironment = 'sandbox' | 'production';

export type PayJustNowConfig = {
  enabled: boolean;
  environment: PayJustNowEnvironment;
  baseUrl: string;
  merchantAccountId: string;
  signingSecret: string;
  cancelUrl: string;
  appOrigin: string;
};

export type PayJustNowOrderItem = {
  name: string;
  sku: string;
  quantity: number;
  priceCents: number;
  imageUrl?: string;
  pageUrl?: string;
};

export type PayJustNowShippingAddress = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
};

const BASE_URLS: Record<PayJustNowEnvironment, string> = {
  sandbox: 'https://sandbox-checkout.payjustnow.io/v2',
  production: 'https://checkout.payjustnow.io/v2',
};

const HOSTED_CHECKOUT_HOSTS: Record<PayJustNowEnvironment, string> = {
  sandbox: 'sandbox.payjustnow.com',
  production: 'payjustnow.com',
};

export function getPayJustNowConfig(env: NodeJS.ProcessEnv = process.env): PayJustNowConfig {
  const environment = env.PAYJUSTNOW_ENV === 'production' ? 'production' : 'sandbox';
  return {
    enabled: env.PAYJUSTNOW_ENABLED === 'true',
    environment,
    baseUrl: BASE_URLS[environment],
    merchantAccountId: env.PAYJUSTNOW_MERCHANT_ACCOUNT_ID?.trim() ?? '',
    signingSecret: env.PAYJUSTNOW_SIGNING_SECRET ?? '',
    cancelUrl: env.PAYJUSTNOW_CANCEL_URL?.trim() ?? '',
    appOrigin: env.PAYJUSTNOW_APP_ORIGIN?.trim() ?? '',
  };
}

export function isPayJustNowConfigured(config = getPayJustNowConfig()): boolean {
  return config.enabled && Boolean(
    config.merchantAccountId && config.signingSecret && isApprovedPayJustNowAppOrigin(config.appOrigin)
      && isApprovedPayJustNowApplicationUrl(config.cancelUrl, config.appOrigin),
  );
}

export function isApprovedPayJustNowAppOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const local = (host === 'localhost' || host === '127.0.0.1') && process.env.NODE_ENV === 'test';
    return url.origin === value && (url.protocol === 'https:' || local) && (
      host === 'www.evasale.co.za' || host.endsWith('.vercel.app') || local
    );
  } catch {
    return false;
  }
}

function isApprovedPayJustNowApplicationUrl(value: string, origin: string, expectedPath?: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === origin && (!expectedPath || url.pathname === expectedPath) && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function normalizePayJustNowBody(raw: string): string {
  return raw.replace(/\s/g, '');
}

export function payJustNowSignature(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(normalizePayJustNowBody(rawBody), 'utf8').digest('base64');
}

export function verifyPayJustNowSignature(rawBody: string, received: string, secret: string): boolean {
  if (!received || !secret) return false;
  const expected = createHmac('sha256', secret).update(normalizePayJustNowBody(rawBody), 'utf8').digest('base64');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(received.trim(), 'utf8');
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function isOfficialPayJustNowUrl(value: string, environment?: PayJustNowEnvironment): boolean {
  try {
    const url = new URL(value);
    const allowedHosts = environment
      ? [HOSTED_CHECKOUT_HOSTS[environment]]
      : Object.values(HOSTED_CHECKOUT_HOSTS);
    // API hosts are deliberately not valid browser redirect destinations.
    return url.protocol === 'https:'
      && allowedHosts.includes(url.hostname.toLowerCase())
       && new RegExp(`^/api/v2/app/checkout/[^/]+$`).test(url.pathname)
      && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function createPayJustNowRequest(params: {
  orderNumber: string;
  amountCents: number;
  customerEmail: string;
  cancelUrl: string;
  requestId: string;
  items: PayJustNowOrderItem[];
  confirmUrl: string;
  shippingAddress?: PayJustNowShippingAddress;
  shippingCents?: number;
  discountCents?: number;
}) {
  if (params.discountCents) {
    throw new Error('PayJustNow cannot represent this cart discount in the documented order item fields. Choose another payment method.');
  }
  const orderItems = [...params.items];
  if (params.shippingCents) orderItems.push({ name: 'Shipping', sku: 'BREEEZ-SHIPPING', quantity: 1, priceCents: params.shippingCents });
  const itemAmountCents = orderItems.reduce((sum, item) => sum + item.quantity * item.priceCents, 0);
  if (!Number.isSafeInteger(itemAmountCents) || itemAmountCents !== params.amountCents) {
    throw new Error('PayJustNow requires orderAmountCents and checkoutTotalCents to equal the order item sum.');
  }
  return {
    requestId: params.requestId,
    payjustnow: {
      merchantOrderReference: params.orderNumber,
      orderAmountCents: itemAmountCents,
      orderItems,
      customer: { email: params.customerEmail },
       ...(params.shippingAddress ? { shippingAddress: params.shippingAddress } : {}),
      confirmRedirectUrl: params.confirmUrl,
      cancelRedirectUrl: params.cancelUrl,
    },
    checkoutTotalCents: params.amountCents,
  };
}

function stringValue(body: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

export function validatePayJustNowCallback(params: {
  body: Record<string, unknown>;
  expectedOrderNumber: string;
  expectedCurrency: string;
  expectedAmountCents: number;
}): { ok: true; status: string; paymentReference: string; checkoutToken: string; statusAt: string } | { ok: false; error: string } {
  const body = params.body;
  const status = stringValue(body, 'checkoutPaymentStatus')?.toUpperCase();
  const order = stringValue(body, 'merchantOrderReference');
  const checkoutToken = stringValue(body, 'checkoutToken');
  const paymentReference = stringValue(body, 'paymentReference');
  if (!status || !['PAID', 'PAID_PENDING_CALLBACK'].includes(status)) return { ok: false, error: 'Payment is not paid' };
  if (!order || order !== params.expectedOrderNumber) return { ok: false, error: 'Order identity mismatch' };
  if (!checkoutToken) return { ok: false, error: 'Missing checkout token' };
  if (!paymentReference) return { ok: false, error: 'Missing payment reference' };
  if (paymentReference === checkoutToken) return { ok: false, error: 'Payment reference must differ from checkout token' };
  const callbackTotalValue = body.checkoutTotalCents;
  const callbackTotal = typeof callbackTotalValue === 'number'
    ? callbackTotalValue
    : typeof callbackTotalValue === 'string' && callbackTotalValue.trim() !== ''
      ? Number(callbackTotalValue)
      : NaN;
  if (!Number.isFinite(callbackTotal) || !Number.isInteger(callbackTotal)
      || callbackTotal !== params.expectedAmountCents) {
    return { ok: false, error: 'Amount mismatch' };
  }
  const currency = body.currency;
  if (typeof currency !== 'string' || currency !== 'ZAR' || params.expectedCurrency !== 'ZAR') {
    return { ok: false, error: 'Currency mismatch' };
  }
  const statusAt = stringValue(body, 'statusAt') ?? '';
  return { ok: true, status, paymentReference, checkoutToken, statusAt };
}

export async function getPayJustNowStatus(checkoutToken: string, expectedAmountCents?: number, expectedCurrency?: string): Promise<Record<string, unknown>> {
  const config = getPayJustNowConfig();
  if (!isPayJustNowConfigured(config)) throw new Error('PayJustNow is not configured.');
  const body = JSON.stringify(createPayJustNowStatusRequest(checkoutToken));
  const response = await fetch(`${config.baseUrl}/getstatus`, { method: 'POST', headers: payJustNowHeaders(config, body), body, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`PayJustNow status request failed (${response.status}).`);
  const result = await response.json() as Record<string, unknown>;
  if (!validatePayJustNowStatus(result, checkoutToken, expectedAmountCents, expectedCurrency).ok) throw new Error('PayJustNow returned an invalid checkout status.');
  return result;
}

export function createPayJustNowStatusRequest(checkoutToken: string) {
  return { checkoutToken };
}

export function createPayJustNowCancelRequest(checkoutToken: string) {
  return { checkoutToken };
}

export function createPayJustNowRefundRequest(params: { checkoutToken: string; requestId: string; merchantRefundReference: string; refundAmountCents: number; refundDescription: string }) {
  return params;
}

export function validatePayJustNowStatus(body: Record<string, unknown>, expectedCheckoutToken?: string, expectedAmountCents?: number, expectedCurrency?: string): { ok: true; status: string } | { ok: false; error: string } {
  const token = stringValue(body, 'checkoutToken');
  const status = stringValue(body, 'checkoutPaymentStatus')?.toUpperCase();
  const amountValue = body.checkoutTotalCents;
  const amount = typeof amountValue === 'number'
    ? amountValue
    : typeof amountValue === 'string' && amountValue.trim() !== ''
      ? Number(amountValue)
      : NaN;
  if (!token || (expectedCheckoutToken && token !== expectedCheckoutToken)) return { ok: false, error: 'Checkout token mismatch' };
  if (!status) return { ok: false, error: 'Missing checkout payment status' };
  if (!Number.isSafeInteger(amount) || (expectedAmountCents !== undefined && amount !== expectedAmountCents)) return { ok: false, error: 'Amount mismatch' };
  const currency = body.currency;
  if (typeof currency !== 'string' || currency !== 'ZAR' || (expectedCurrency !== undefined && expectedCurrency !== 'ZAR')) {
    return { ok: false, error: 'Currency mismatch' };
  }
  return { ok: true, status };
}

export type PayJustNowCancellationStatus = 'confirmed' | 'cancellable' | 'ambiguous' | 'paid';

export function classifyPayJustNowCancellationStatus(status: string): PayJustNowCancellationStatus {
  const normalized = status.toUpperCase();
  if (normalized === 'CANCELLED_BY_MERCHANT') return 'confirmed';
  if (normalized === 'PAID' || normalized === 'PAID_PENDING_CALLBACK') return 'paid';
  if (['PENDING_ORDER', 'CANCELLED_BY_CONSUMER'].includes(normalized)) return 'cancellable';
  return 'ambiguous';
}

export function payJustNowHeaders(config: PayJustNowConfig, body: string, requestId?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'User-Agent': 'Breeez/PayJustNow',
    'X-Merchant-Account-ID': config.merchantAccountId,
    'X-Signature': payJustNowSignature(body, config.signingSecret),
    ...(requestId ? { 'Idempotency-Key': requestId } : {}),
  };
}

export async function payJustNowCancelOrRefund(params: {
  action: 'cancel' | 'refund';
  checkoutToken: string;
  orderNumber: string;
  amountCents?: number;
}): Promise<{ ok: true; status: number; body: unknown } | { ok: false; status: number; error: string }> {
  const config = getPayJustNowConfig();
  if (!isPayJustNowConfigured(config)) return { ok: false, status: 503, error: 'PayJustNow is not configured.' };
  const requestId = `breeez-${params.action}-${params.orderNumber}-${params.checkoutToken}`;
  const payload = params.action === 'cancel'
    ? createPayJustNowCancelRequest(params.checkoutToken)
    : createPayJustNowRefundRequest({ requestId, checkoutToken: params.checkoutToken, merchantRefundReference: `RF-${params.orderNumber}`, refundAmountCents: params.amountCents!, refundDescription: `Refund for ${params.orderNumber}` });
  const body = JSON.stringify(payload);
  const response = await fetch(`${config.baseUrl}/${params.action}`, {
    method: 'POST', headers: payJustNowHeaders(config, body, requestId), body, signal: AbortSignal.timeout(10000),
  });
  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: `PayJustNow ${params.action} failed.` };
  if (params.action === 'refund') {
    const refund = responseBody as Record<string, unknown>;
    if (refund.refundStatus !== 'SUCCESS' || refund.refundedAmountCents !== params.amountCents) {
      return { ok: false, status: 502, error: 'PayJustNow refund was not confirmed.' };
    }
  } else if ((responseBody as Record<string, unknown>).checkoutPaymentStatus !== 'CANCELLED_BY_MERCHANT') {
    return { ok: false, status: 502, error: 'PayJustNow cancellation was not confirmed.' };
  }
  return { ok: true, status: response.status, body: responseBody };
}

export async function cancelPayJustNowCheckout(checkoutToken: string, orderNumber: string) {
  return payJustNowCancelOrRefund({ action: 'cancel', checkoutToken, orderNumber });
}
