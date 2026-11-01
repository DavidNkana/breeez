'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Payfast Onsite Payments — the payment modal, rendered inside our page.
 *
 * The hosted checkout navigates the customer to payfast.co.za and back. In the
 * native app that throws them out into a browser and loses the flow. Onsite
 * keeps everything in the same WebView: we ask our server for a payment
 * identifier, Payfast's engine renders the payment modal right here, and the
 * confirmation still arrives at our notify_url.
 *
 * If Onsite is not enabled on the merchant account the server says so and
 * the caller falls back to the hosted checkout.
 */

type PayfastOnsite = {
  payfast_do_onsite_payment?: (
    options: { uuid: string; return_url?: string; cancel_url?: string },
    callback?: (result: boolean) => void,
  ) => void;
};

declare global {
  interface Window {
    payfast_do_onsite_payment?: PayfastOnsite['payfast_do_onsite_payment'];
  }
}

let enginePromise: Promise<boolean> | null = null;

/** Load Payfast's onsite engine once per page. */
function loadEngine(engineUrl: string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.payfast_do_onsite_payment) return Promise.resolve(true);
  if (enginePromise) return enginePromise;

  enginePromise = new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = engineUrl;
    script.async = true;
    script.onload = () => resolve(Boolean(window.payfast_do_onsite_payment));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return enginePromise;
}

export type OnsiteOutcome = 'paid' | 'cancelled' | 'unavailable';

export function usePayfastOnsite() {
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  /**
   * Open the payment modal for an order.
   *
   * Returns what happened so the caller can fall back to the hosted
   * checkout when Onsite is unavailable.
   */
  const pay = useCallback(
    async (params: {
      orderId: string;
      email: string;
      /** Optional: the signed order token. Checkout requires a signed-in
       *  customer, so the session identifies the order on its own. */
      token?: string;
      fallbackUrl?: string;
      onPaid?: () => void;
      onCancelled?: () => void;
    }): Promise<OnsiteOutcome> => {
      if (busy.current) return 'cancelled';
      busy.current = true;
      setLoading(true);
      try {
        const res = await fetch('/api/payfast/onsite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: params.orderId,
            email: params.email,
            token: params.token,
          }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.uuid) {
          // Onsite is not available (most often: not enabled on the merchant
          // account). Fall back to the hosted checkout so the customer can
          // still pay.
          if (params.fallbackUrl) {
            window.location.assign(params.fallbackUrl);
            return 'unavailable';
          }
          return 'unavailable';
        }

        const engineReady = await loadEngine(data.engineUrl);
        if (!engineReady || !window.payfast_do_onsite_payment) {
          if (params.fallbackUrl) {
            window.location.assign(params.fallbackUrl);
            return 'unavailable';
          }
          return 'unavailable';
        }

        return await new Promise<OnsiteOutcome>((resolve) => {
          window.payfast_do_onsite_payment!(
            {
              uuid: data.uuid,
              return_url: data.returnUrl,
              cancel_url: data.cancelUrl,
            },
            (result: boolean) => {
              if (result === true) {
                params.onPaid?.();
                resolve('paid');
              } else {
                params.onCancelled?.();
                resolve('cancelled');
              }
            },
          );
        });
      } catch {
        if (params.fallbackUrl) {
          window.location.assign(params.fallbackUrl);
          return 'unavailable';
        }
        return 'unavailable';
      } finally {
        busy.current = false;
        setLoading(false);
      }
    },
    [],
  );

  return { pay, loading };
}
