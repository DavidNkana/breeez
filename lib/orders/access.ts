import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed access tokens for order pages.
 *
 * A guest who pays with PayFast comes back to the success page without an
 * account. Without this they would see nothing at all — just "continue
 * shopping" — because the order belongs to no signed-in customer.
 *
 * The token is an HMAC over the order id and the order email, so:
 *   - it cannot be forged without the server secret
 *   - it cannot be reused for a different order
 *   - the URL can be shared/bookmarked by the customer without leaking the
 *     order to anyone who does not have the token
 */

function getSecret(): string {
  // ORDER_ACCESS_SECRET is preferred. The PayFast passphrase is a reasonable
  // fallback because it is already a server-only secret that must be stable
  // across deployments (a rotating secret would break links already sent to
  // customers by email).
  return process.env.ORDER_ACCESS_SECRET || process.env.PAYFAST_PASSPHRASE || 'evasale-dev-order-access';
}

function payload(orderId: string, email: string): string {
  return `${orderId}:${email.toLowerCase()}`;
}

/** Create a signed token that lets anyone holding it read this order. */
export function signOrderAccess(orderId: string, email: string): string {
  return createHmac('sha256', getSecret()).update(payload(orderId, email)).digest('hex');
}

/** Verify a token against the order it claims to unlock. */
export function verifyOrderAccess(orderId: string, email: string, token: string | null | undefined): boolean {
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) return false;
  const expected = signOrderAccess(orderId, email);
  return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(token.toLowerCase(), 'utf8'));
}
