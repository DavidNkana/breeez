'use client';

/**
 * Client-safe mock mode check.
 * Always returns true unless MOCK_PAYMENTS env is explicitly 'false'.
 *
 * Server-side code that actually creates payment intents lives in
 * lib/payments/server.ts (which uses node:crypto for PayFast MD5).
 */

const MOCK = process.env.NEXT_PUBLIC_MOCK_PAYMENTS !== 'false';

export function isMockMode(): boolean {
  return MOCK;
}

/**
 * Client-side stub. The real createPayment function (which talks to PayFast /
 * Yoco / Ozow) lives in lib/payments/server.ts and is only called from
 * server route handlers (api/checkout/create-payment).
 */
export async function createPayment(_params: any): Promise<{ reference: string; redirectUrl: string }> {
  throw new Error('createPayment must be called from the server');
}