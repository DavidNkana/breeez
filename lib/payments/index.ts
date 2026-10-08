'use client';

export type MockPaymentConfig = { enabled: boolean };

/**
 * Client-safe view of the server payment configuration. The server must
 * provide this value; browser environment variables are not trusted for
 * payment decisions.
 */

export function isMockMode(config: MockPaymentConfig): boolean {
  return config.enabled === true;
}

/**
 * Client-side stub. The real createPayment function (which talks to PayFast)
 * lives in lib/payments/server.ts and is only called from
 * server route handlers (api/checkout/create-payment).
 */
export async function createPayment(_params: any): Promise<{ reference: string; redirectUrl: string }> {
  throw new Error('createPayment must be called from the server');
}
