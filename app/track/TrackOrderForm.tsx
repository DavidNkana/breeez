'use client';

import { useFormState } from 'react-dom';
import { useFormStatus } from 'react-dom';
import { OrderReceipt } from '@/components/orders/OrderReceipt';
import { trackOrder, type TrackState } from './actions';

const INITIAL: TrackState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-600 disabled:opacity-60"
    >
      {pending ? 'Looking for your order…' : 'Find my order'}
    </button>
  );
}

export function TrackOrderForm({ defaultOrderNumber }: { defaultOrderNumber?: string }) {
  const [state, formAction] = useFormState(trackOrder, INITIAL);

  return (
    <>
      <form action={formAction} className="mx-auto mt-6 max-w-md space-y-3 rounded-lg border border-brand-200 bg-white p-4 dark:border-brand-800 dark:bg-brand-900">
        <div>
          <label htmlFor="order_number" className="mb-1 block text-xs font-semibold uppercase text-brand-500">
            Order number
          </label>
          <input
            id="order_number"
            name="order_number"
            defaultValue={defaultOrderNumber}
            placeholder="TDTD-2026-00025"
            required
            className="w-full rounded-md border border-brand-300 bg-white px-3 py-2 text-sm dark:border-brand-600 dark:bg-brand-950 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-semibold uppercase text-brand-500">
            Email used at checkout
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            className="w-full rounded-md border border-brand-300 bg-white px-3 py-2 text-sm dark:border-brand-600 dark:bg-brand-950 dark:text-white"
          />
        </div>
        <SubmitButton />
      </form>

      {state.error && (
        <p className="mx-auto mt-4 max-w-md rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      {state.ok && state.receipt && (
        <div className="mt-8">
          <OrderReceipt order={state.receipt} showEmail />
          <p className="mt-4 text-center text-xs text-brand-500">
            Keep your order number handy — you can come back any time to check on your parcel.
          </p>
        </div>
      )}
    </>
  );
}
