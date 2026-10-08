import 'server-only';
import { isMockPaymentsEnabled } from './mock-mode';

/**
 * Server-side payment gateway integration.
 * Only imported by api/checkout/create-payment/route.ts.
 */

export type PaymentIntent = {
  reference: string;
  redirectUrl: string;
};

export type PaymentMethod = 'payfast';

export async function createPayment(params: {
  orderId: string;
  orderNumber: string;
  amountCents: number;
  customerEmail: string;
  method: PaymentMethod;
  returnUrl: string;
  cancelUrl: string;
}): Promise<PaymentIntent> {
  if (isMockPaymentsEnabled()) {
    const ref = `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return { reference: ref, redirectUrl: `${params.returnUrl}&mock=1&ref=${ref}` };
  }
  switch (params.method) {
    case 'payfast': return await createPayFastPayment(params);
  }
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
