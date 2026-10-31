import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { loadOrderReceipt } from '@/lib/orders/receipt';
import { OrderReceipt } from '@/components/orders/OrderReceipt';
import { brand } from '@/lib/brand';

type Props = {
  searchParams: { order?: string; email?: string; found?: string };
};

export const metadata = { title: 'Track your order — Evasale' };

export default async function TrackOrderPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const orderNumber = (searchParams.order ?? '').trim();
  const email = (searchParams.email ?? '').trim();

  // A lookup that succeeded redirects to the receipt with a signed link.
  let receipt = null;
  if (searchParams.found && orderNumber) {
    receipt = await loadOrderReceiptByNumberAndEmail(orderNumber, email);
  }

  return (
    <>
      <main className="mx-auto max-w-2xl px-4 py-10 pb-20 safe-bottom">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-brand-950">Track your order</h1>
          <p className="mt-2 text-sm text-brand-600">
            Enter your order number and the email address you used at checkout to see exactly where your
            parcel is.
          </p>
        </div>

        <form method="GET" action="/track" className="mx-auto mt-6 max-w-md space-y-3 rounded-lg border border-brand-200 bg-white p-4 dark:border-brand-800 dark:bg-brand-900">
          <div>
            <label htmlFor="order_number" className="mb-1 block text-xs font-semibold uppercase text-brand-500">
              Order number
            </label>
            <input
              id="order_number"
              name="order_number"
              defaultValue={orderNumber}
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
              defaultValue={email}
              placeholder="you@example.com"
              required
              className="w-full rounded-md border border-brand-300 bg-white px-3 py-2 text-sm dark:border-brand-600 dark:bg-brand-950 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-600"
          >
            Find my order
          </button>
        </form>

        {searchParams.found === 'no' && (
          <p className="mx-auto mt-4 max-w-md rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            We could not find an order with that number and email. Please check the details and try again.
          </p>
        )}

        {receipt ? (
          <div className="mt-8">
            <OrderReceipt order={receipt} showEmail />
            <p className="mt-4 text-center text-xs text-brand-500">
              Keep this link to check on your order later:{' '}
              <span className="font-mono">
                /track?order={receipt.orderNumber}&email={encodeURIComponent(receipt.email)}
              </span>
            </p>
          </div>
        ) : (
          <div className="mx-auto mt-8 max-w-md rounded-lg border border-brand-200 bg-brand-50/60 p-4 text-sm text-brand-700 dark:border-brand-800 dark:bg-brand-900 dark:text-brand-200">
            <h2 className="text-sm font-semibold text-brand-950">Need help with an order?</h2>
            <p className="mt-1.5">
              WhatsApp us on{' '}
              <a href={`tel:${brand.contact.phoneLink}`} className="font-medium text-accent-700 underline">
                {brand.contact.phone}
              </a>{' '}
              or email{' '}
              <a href={`mailto:${brand.contact.email}`} className="font-medium text-accent-700 underline">
                {brand.contact.email}
              </a>
              {user ? ' — your orders are also in your account.' : ' — or sign in to see all your orders.'}
            </p>
            {!user && (
              <Link href="/auth/login?next=%2Faccount%2Forders" className="mt-2 inline-block text-sm font-medium text-accent-700 underline">
                Sign in to my account
              </Link>
            )}
          </div>
        )}
      </main>
    </>
  );
}

async function loadOrderReceiptByNumberAndEmail(orderNumber: string, email: string) {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = await createAdminClient();
  const { data } = (await admin
    .from('orders')
    .select('id')
    .eq('order_number', orderNumber)
    .ilike('email', email)
    .maybeSingle()) as any;
  if (!data) return null;
  return loadOrderReceipt(data.id);
}
