import 'server-only';
import { isMockPaymentsEnabled } from './mock-mode';

/**
 * Server-side payment gateway integration.
 * Only imported by api/checkout/create-payment/route.ts.
 */

export type PaymentIntent = {
  reference: string;
  redirectUrl: string;
  checkoutToken?: string;
  paymentReference?: string;
};

export type PaymentMethod = 'payfast' | 'payjustnow';

export async function createPayment(params: {
  orderId: string;
  orderNumber: string;
  amountCents: number;
  customerEmail: string;
  method: PaymentMethod;
  returnUrl: string;
  cancelUrl: string;
  shippingCents?: number;
  discountCents?: number;
  shippingAddress?: Record<string, unknown>;
  items?: Array<{ name: string; sku: string; quantity: number; priceCents: number; imageUrl?: string; pageUrl?: string }>;
}): Promise<PaymentIntent> {
  if (isMockPaymentsEnabled()) {
    const ref = `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return { reference: ref, redirectUrl: `${params.returnUrl}&mock=1&ref=${ref}` };
  }
  switch (params.method) {
    case 'payfast': return await createPayFastPayment(params);
    case 'payjustnow': return await createPayJustNowPayment(params);
  }
}

async function createPayJustNowPayment(p: { orderId: string; orderNumber: string; amountCents: number; customerEmail: string; returnUrl: string; cancelUrl: string; shippingCents?: number; discountCents?: number; shippingAddress?: Record<string, unknown>; items?: Array<{ name: string; sku: string; quantity: number; priceCents: number; imageUrl?: string; pageUrl?: string }> }): Promise<PaymentIntent> {
  const { createPayJustNowRequest, getPayJustNowConfig, isOfficialPayJustNowUrl, isPayJustNowConfigured, payJustNowHeaders } = await import('./payjustnow');
  const config = getPayJustNowConfig();
  if (!isPayJustNowConfigured(config)) throw new Error('PayJustNow is not configured.');
  const requestId = `breeez-${p.orderId}`;
  const appOrigin = config.appOrigin;
  const payload = createPayJustNowRequest({
    orderNumber: p.orderNumber, amountCents: p.amountCents,
     customerEmail: p.customerEmail, cancelUrl: `${appOrigin}/cart`, requestId,
    items: p.items ?? [{ name: 'Breeez order', sku: p.orderNumber, quantity: 1, priceCents: p.amountCents }],
     confirmUrl: `${appOrigin}/checkout/success/${p.orderId}?ref=${encodeURIComponent(p.orderNumber)}`,
     shippingAddress: p.shippingAddress ? {
       addressLine1: String(p.shippingAddress.line1 ?? ''),
       addressLine2: String(p.shippingAddress.line2 ?? ''),
       city: String(p.shippingAddress.city ?? ''),
       province: String(p.shippingAddress.province ?? ''),
       postalCode: String(p.shippingAddress.postal_code ?? ''),
     } : undefined,
    shippingCents: p.shippingCents,
    discountCents: p.discountCents,
  });
  const body = JSON.stringify(payload);
  const response = await fetch(`${config.baseUrl}/create`, {
    method: 'POST', headers: payJustNowHeaders(config, body, requestId), body, signal: AbortSignal.timeout(10000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`PayJustNow checkout creation failed (${response.status}).`);
  const paymentUrl = typeof result.paymentUrl === 'string' ? result.paymentUrl : '';
  if (!isOfficialPayJustNowUrl(paymentUrl, config.environment)) throw new Error('PayJustNow returned an invalid checkout URL.');
  const checkoutToken = typeof result.checkoutToken === 'string' ? result.checkoutToken : '';
  if (!checkoutToken) throw new Error('PayJustNow did not return a checkout token.');
  if (result.merchantOrderReference !== p.orderNumber) throw new Error('PayJustNow returned an unexpected merchant order reference.');
  if (result.checkoutTotalCents !== p.amountCents) throw new Error('PayJustNow returned an unexpected checkout total.');
  if (typeof result.checkoutPaymentStatus !== 'string') throw new Error('PayJustNow did not return a checkout payment status.');
  return { reference: requestId, redirectUrl: paymentUrl, checkoutToken };
}

export function isMockMode(): boolean {
  return isMockPaymentsEnabled();
}

async function createPayFastPayment(p: { orderId: string; orderNumber: string; amountCents: number; customerEmail: string; returnUrl: string; cancelUrl: string }): Promise<PaymentIntent> {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const sandbox = process.env.PAYFAST_SANDBOX === 'true';

  if (!merchantId || !merchantKey) {
    throw new Error('PayFast credentials not configured.');
  }

  const baseUrl = sandbox ? 'https://sandbox.payfast.co.za/eng/process' : 'https://www.payfast.co.za/eng/process';
  const { buildPayFastFields, getPayFastAppOrigin, payFastSignature } = await import('./payfast');
  const appOrigin = getPayFastAppOrigin();
  const data = buildPayFastFields({
    merchantId,
    merchantKey,
    orderId: p.orderId,
    orderNumber: p.orderNumber,
    amountCents: p.amountCents,
    customerEmail: p.customerEmail,
    returnUrl: `${appOrigin}/checkout/success/${p.orderId}?ref=${p.orderNumber}`,
    cancelUrl: `${appOrigin}/cart`,
    notifyUrl: `${appOrigin}/api/webhooks/payfast`,
  });

  const query = Object.entries(data)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

  const signature = payFastSignature(Object.entries(data), passphrase);

  return { reference: p.orderId, redirectUrl: `${baseUrl}?${query}&signature=${signature}` };
}
