import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { loadOrderReceipt } from '@/lib/orders/receipt';
import { verifyOrderAccess } from '@/lib/orders/access';
import { OrderTabs } from '@/components/orders/OrderTabs';
import { loadOrderReviews } from '@/lib/orders/reviews';
import { brand } from '@/lib/brand';
import { formatRand } from '@/lib/format';

type Props = { params: { order: string }; searchParams: { ref?: string; token?: string } };

export const metadata = { title: 'Order confirmed — Evasale' };

export default async function OrderSuccessPage({ params, searchParams }: Props) {
  const user = await getCurrentUser();
  const order = await loadOrderReceipt(params.order);

  // A guest who just paid has no account. They may read the receipt when the
  // link carries the signed token issued with the payment, or when they are
  // signed in as the customer who placed it.
  const isOwner = Boolean(order && user && user.id && order.customerId === user.id);
  const hasToken = Boolean(
    order && verifyOrderAccess(order.id, order.email, searchParams.token),
  );

  if (!order) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 pb-20 safe-bottom text-center">
        <h1 className="text-2xl font-semibold text-brand-950">We could not find that order</h1>
        <p className="mt-2 text-sm text-brand-600">
          If you have just paid, your confirmation email contains a link to your order. You can also look it
          up with your order number and email address.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/track" className="inline-flex items-center rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50 dark:border-brand-600 dark:text-white dark:hover:bg-brand-800">
            Track my order
          </Link>
          <Link href="/" className="inline-flex items-center rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-600">
            Continue shopping
          </Link>
        </div>
      </main>
    );
  }

  const paid = order.status === 'paid';
  const reviews = order ? await loadOrderReviews(order.id, user?.id ?? null) : null;
  const deliveryReview = reviews?.delivery ?? null;
  const cancelled = order.status === 'cancelled' || order.status === 'refunded';

  if (!isOwner && !hasToken) {
    // We know the order exists but this visitor cannot prove it is theirs.
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 pb-20 safe-bottom text-center">
        <h1 className="text-2xl font-semibold text-brand-950">Order {order.orderNumber}</h1>
        <p className="mt-2 text-sm text-brand-600">
          For your security we need to check this order belongs to you. Look it up with your order number
          and the email address you used at checkout.
        </p>
        <Link
          href={`/track?order=${order.orderNumber}`}
          className="mt-6 inline-flex items-center rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-600"
        >
          Look up my order
        </Link>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-2xl px-4 py-10 pb-20 safe-bottom">
        <div className="text-center">
          <div
            className={[
              'mx-auto flex h-14 w-14 items-center justify-center rounded-full',
              paid ? 'bg-success/10 text-success' : '',
              cancelled ? 'bg-danger/10 text-danger' : '',
              !paid && !cancelled ? 'bg-brand-100 text-brand-600' : '',
            ].join(' ')}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {paid ? <path d="M5 13l4 4L19 7" /> : <path d="M12 8v4l3 2" />}
            </svg>
          </div>

          <h1 className="mt-4 text-2xl font-semibold text-brand-950">
            {paid
              ? 'Payment received — thank you!'
              : cancelled
                ? `Order ${order.orderNumber} was cancelled`
                : 'Payment is being confirmed'}
          </h1>
          <p className="mt-2 text-sm text-brand-600">
            {paid
              ? 'We have your order and a confirmation is on its way to your inbox. You can follow every step below.'
              : cancelled
                ? 'Your payment was refunded to the original payment method.'
                : 'Your order is reserved while PayFast confirms the payment. We only fulfil an order once the payment is verified on our server — so please wait a moment before paying again.'}
          </p>
          <p className="mt-1 text-sm font-medium text-brand-800">
            Order <span className="font-mono">{order.orderNumber}</span> · {formatRand(order.totalCents)}
          </p>
        </div>

        <div className="mt-8">
          <OrderTabs
            order={order}
            loggedIn={Boolean(user)}
            canRate={paid}
            deliveryReview={deliveryReview}
            showEmail
            trackingHref={isOwner ? `/account/orders/${order.id}` : `/track?order=${order.orderNumber}`}
          />
        </div>

        {/* What happens next — set expectations clearly. */}
        <section className="mt-6 rounded-lg border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-800 dark:bg-brand-900">
          <h2 className="text-sm font-semibold text-brand-950">What happens next</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-brand-700 dark:text-brand-200">
            <li>You get a confirmation email with this receipt (check spam if it does not arrive).</li>
            <li>We email you again when your order is packed and on its way.</li>
            <li>The Courier Guy delivers in 2–5 working days, and your tracking number appears here.</li>
          </ol>
          <p className="mt-3 text-sm text-brand-700 dark:text-brand-200">
            Need help with this order? WhatsApp us on{' '}
            <a href={`tel:${brand.contact.phoneLink}`} className="font-medium text-accent-700 underline">
              {brand.contact.phone}
            </a>{' '}
            or email{' '}
            <a href={`mailto:${brand.contact.email}`} className="font-medium text-accent-700 underline">
              {brand.contact.email}
            </a>
            .
          </p>
        </section>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {isOwner ? (
            <Link href={`/account/orders/${order.id}`} className="inline-flex items-center rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50 dark:border-brand-600 dark:text-white dark:hover:bg-brand-800">
              Track this order
            </Link>
          ) : (
            <Link href={`/track?order=${order.orderNumber}`} className="inline-flex items-center rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50 dark:border-brand-600 dark:text-white dark:hover:bg-brand-800">
              Track this order
            </Link>
          )}
          <Link href="/account/orders" className="inline-flex items-center rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50 dark:border-brand-600 dark:text-white dark:hover:bg-brand-800">
            All my orders
          </Link>
          <Link href="/" className="inline-flex items-center rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-600">
            Continue shopping
          </Link>
        </div>
      </main>
    </>
  );
}
