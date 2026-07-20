import 'server-only';

/**
 * Server-side payment gateway integration.
 * Only imported by api/checkout/create-payment/route.ts.
 */

const MOCK = process.env.MOCK_PAYMENTS !== 'false';

export type PaymentIntent = {
  reference: string;
  redirectUrl: string;
};

export type PaymentMethod = 'payfast' | 'yoco' | 'ozow';

export async function createPayment(params: {
  orderId: string;
  orderNumber: string;
  amountCents: number;
  customerEmail: string;
  method: PaymentMethod;
  returnUrl: string;
  cancelUrl: string;
}): Promise<PaymentIntent> {
  if (MOCK) {
    const ref = `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return { reference: ref, redirectUrl: `${params.returnUrl}&mock=1&ref=${ref}` };
  }
  switch (params.method) {
    case 'payfast': return await createPayFastPayment(params);
    case 'yoco':    return await createYocoPayment(params);
    case 'ozow':    return await createOzowPayment(params);
  }
}

export function isMockMode(): boolean {
  return MOCK;
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
  const data: Record<string, string | number> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: p.returnUrl,
    cancel_url: p.cancelUrl,
    notify_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : ''}/api/webhooks/payfast`,
    name: 'Trends Day-to-Day',
    item_name: `Order ${p.orderNumber}`,
    item_description: `Trends Day-to-Day order ${p.orderNumber}`,
    amount: (p.amountCents / 100).toFixed(2),
    email: p.customerEmail
  };

  const query = Object.entries(data)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

  const signatureString = passphrase ? `${query}&passphrase=${encodeURIComponent(passphrase)}` : query;
  const { createHash } = await import('node:crypto');
  const signature = createHash('md5').update(signatureString).digest('hex');

  return { reference: p.orderId, redirectUrl: `${baseUrl}?${query}&signature=${signature}` };
}

async function createYocoPayment(_p: any): Promise<PaymentIntent> {
  throw new Error('Yoco integration requires YOCO_SECRET_KEY env. Set up in Vercel when ready.');
}

async function createOzowPayment(_p: any): Promise<PaymentIntent> {
  throw new Error('Ozow integration requires OZOW_SITE_CODE + OZOW_PRIVATE_KEY env. Set up in Vercel when ready.');
}