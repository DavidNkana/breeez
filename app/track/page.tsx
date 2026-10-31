import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { TrackOrderForm } from './TrackOrderForm';
import { brand } from '@/lib/brand';

type Props = { searchParams: { order?: string } };

export const metadata = { title: 'Track your order — Evasale' };

export default async function TrackOrderPage({ searchParams }: Props) {
  const user = await getCurrentUser();

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

        <TrackOrderForm defaultOrderNumber={searchParams.order?.trim()} />

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
      </main>
    </>
  );
}
