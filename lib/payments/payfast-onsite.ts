import { createHash } from 'node:crypto';
import { payFastUrlEncode } from './payfast';

/**
 * Payfast "Onsite Payments" — the payment engine rendered inside OUR page.
 *
 * The hosted checkout sends the customer to payfast.co.za and back. On a
 * native app that means the customer leaves the app for a browser page and
 * has to come back, which breaks the flow and loses the session.
 *
 * Onsite avoids the redirect entirely: we POST the transaction to
 * /onsite/process, Payfast returns a payment identifier (uuid), and their
 * engine renders the payment modal inside our own checkout page. In the
 * native app that modal appears in the WebView — the customer never leaves.
 *
 * The payment confirmation (ITN) still arrives at our notify_url, exactly as
 * it does for the hosted checkout.
 *
 * Requires HTTPS and Onsite to be enabled on the merchant account.
 */

export type OnsiteFields = Record<string, string>;

/**
 * The classic Payfast API signature: fields sorted by key, url-encoded,
 * with the passphrase appended.
 */
export function payFastApiSignature(fields: OnsiteFields, passphrase?: string): string {
  const keys = Object.keys(fields)
    .filter((key) => String(fields[key] ?? '').trim() !== '')
    .sort();
  const parts = keys.map((key) => `${key}=${payFastUrlEncode(String(fields[key]).trim())}`);
  let payload = parts.join('&');
  if (passphrase) payload += `&passphrase=${payFastUrlEncode(passphrase.trim())}`;
  return createHash('md5').update(payload).digest('hex');
}

export function payFastOnsiteBase(sandbox: boolean): string {
  return sandbox ? 'https://sandbox.payfast.co.za' : 'https://www.payfast.co.za';
}

/** The script that renders the payment modal. */
export function payFastOnsiteEngineUrl(sandbox: boolean): string {
  return `${payFastOnsiteBase(sandbox)}/onsite/engine.js`;
}

export type OnsiteResult = {
  ok: boolean;
  uuid?: string;
  error?: string;
  /** True when the merchant has not enabled Onsite on their account. */
  notEnabled?: boolean;
};

/**
 * Create the payment identifier for an order.
 *
 * The fields mirror the hosted checkout, plus the cell number and email
 * address Onsite requires to identify the payer.
 */
export async function createOnsitePayment(params: {
  merchantId: string;
  merchantKey: string;
  passphrase: string;
  sandbox: boolean;
  orderId: string;
  orderNumber: string;
  amountCents: number;
  customerEmail: string;
  customerPhone?: string;
  customerName?: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  reference?: string;
}): Promise<OnsiteResult> {
  const fields: OnsiteFields = {
    merchant_id: params.merchantId,
    merchant_key: params.merchantKey,
    // The order reference Payfast echoes back on the ITN.
    m_payment_id: params.reference ?? params.orderNumber,
    amount: (params.amountCents / 100).toFixed(2),
    item_name: `Order ${params.orderNumber}`,
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl,
    notify_url: params.notifyUrl,
    email_address: params.customerEmail,
  };

  if (params.customerPhone) fields.cell_number = params.customerPhone;
  if (params.customerName) {
    const [first, ...rest] = params.customerName.trim().split(/\s+/);
    fields.name_first = first;
    if (rest.length) fields.name_last = rest.join(' ');
  }

  const body = new URLSearchParams({ ...fields, signature: payFastApiSignature(fields, params.passphrase) });

  const url = `${payFastOnsiteBase(params.sandbox)}/onsite/process`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    if (!res.ok) {
      // 400/403 here almost always means Onsite is not enabled for the
      // merchant. The caller falls back to the hosted checkout.
      return {
        ok: false,
        notEnabled: res.status === 400 || res.status === 403,
        error: `Onsite request failed (${res.status}): ${text.slice(0, 180)}`,
      };
    }
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, error: `Unexpected Onsite response: ${text.slice(0, 180)}` };
    }
    if (!data?.uuid) {
      return { ok: false, error: 'Payfast did not return a payment identifier' };
    }
    return { ok: true, uuid: String(data.uuid) };
  } catch (error) {
    return {
      ok: false,
      error: `Onsite request error: ${error instanceof Error ? error.message : 'unknown'}`,
    };
  }
}
