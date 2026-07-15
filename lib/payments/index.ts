/**
 * Breeez payment gateways.
 *
 * Three SA gateways: PayFast (primary), Yoco (secondary), Ozow (tertiary).
 *
 * MOCK_PAYMENTS=true skips real gateway calls and marks orders paid immediately.
 * This is the DEFAULT in dev/test. Set to false in Vercel env to go live.
 *
 * Real gateway keys (PAYFAST_MERCHANT_ID, etc.) get added to .env.local + Vercel
 * when Chris is ready to take real payments.
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
    // Mock mode: just return a URL that immediately marks the order paid
    const ref = `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      reference: ref,
      redirectUrl: `${params.returnUrl}&mock=1&ref=${ref}`
    };
  }

  switch (params.method) {
    case 'payfast': return await createPayFastPayment(params);
    case 'yoco':    return await createYocoPayment(params);
    case 'ozow':    return await createOzowPayment(params);
  }
}

async function createPayFastPayment(p: { orderId: string; orderNumber: string; amountCents: number; customerEmail: string; returnUrl: string; cancelUrl: string }): Promise<PaymentIntent> {
  // PayFast signature generation per their docs.
  // When PAYFAST_MERCHANT_ID + KEY + PASSPHRASE are set in env, this generates a real redirect URL.
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const sandbox = process.env.PAYFAST_SANDBOX === 'true';

  if (!merchantId || !merchantKey) {
    throw new Error('PayFast credentials not configured. Set PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE in env, or set MOCK_PAYMENTS=true.');
  }

  const baseUrl = sandbox ? 'https://sandbox.payfast.co.za/eng/process' : 'https://www.payfast.co.za/eng/process';
  const data: Record<string, string | number> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: p.returnUrl,
    cancel_url: p.cancelUrl,
    notify_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : ''}/api/webhooks/payfast`,
    name: 'Breeez',
    item_name: `Order ${p.orderNumber}`,
    item_description: `Breeez order ${p.orderNumber}`,
    amount: (p.amountCents / 100).toFixed(2),
    email: p.customerEmail
  };

  // Build query string
  const query = Object.entries(data)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

  // Generate signature (MD5)
  const signatureString = passphrase ? `${query}&passphrase=${encodeURIComponent(passphrase)}` : query;
  const signature = await md5(signatureString);

  return {
    reference: p.orderId,
    redirectUrl: `${baseUrl}?${query}&signature=${signature}`
  };
}

async function createYocoPayment(_p: any): Promise<PaymentIntent> {
  // Yoco integration: server-side charge via Yoco Payments API
  // Requires YOCO_SECRET_KEY + YOCO_PUBLIC_KEY in env
  // For now, throw clear error if hit
  throw new Error('Yoco integration requires YOCO_SECRET_KEY env. Set up in Vercel when ready.');
}

async function createOzowPayment(_p: any): Promise<PaymentIntent> {
  // Ozow Instant EFT integration
  // Requires OZOW_SITE_CODE + OZOW_PRIVATE_KEY in env
  throw new Error('Ozow integration requires OZOW_SITE_CODE + OZOW_PRIVATE_KEY env. Set up in Vercel when ready.');
}

async function md5(input: string): Promise<string> {
  // Use Node's crypto module (server-side only)
  const { createHash } = await import('node:crypto');
  return createHash('md5').update(input).digest('hex');
}

export function isMockMode(): boolean {
  return MOCK;
}