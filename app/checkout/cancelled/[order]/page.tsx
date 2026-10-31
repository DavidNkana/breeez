import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/session';
import { verifyOrderAccess } from '@/lib/orders/access';
import { RestoreCartOnCancel } from '@/components/checkout/RestoreCartOnCancel';
import { brand } from '@/lib/brand';

type Props = { params: { order: string }; searchParams: { ref?: string; token?: string } };

export const metadata = { title: 'Order cancelled — Evasale' };

/**
 * Where a customer lands when they back out of the payment step.
 *
 * The order is cancelled, the stock goes back to the products and their
 * items are put back in the cart so they can try again straight away.
 */
export default async function CheckoutCancelledPage({ params, searchParams }: Props) {
  const admin = await createAdminClient();
  const user = await getCurrentUser().catch(() => null);

  const { data: order } = (await admin
    .from('orders')
    .select('id, order_number, email, status, customer_id')
    .eq('id', params.order)
    .maybeSingle()) as any;

  let restored: Array<{ variantId: string | null; quantity: number; name: string; priceCents: number }> = [];
  let cancelled = false;

  if (order) {
    const authorised =
      verifyOrderAccess(order.id, order.email, searchParams.token) ||
      Boolean(user && order.customer_id === user.id);

    if (authorised && ['pending_payment', 'cancellation_pending'].includes(order.status)) {
      const { data: cancelledOk } = (await (admin as any).rpc('cancel_order_and_restore_stock', {
        p_order_id: order.id,
      })) as any;
      cancelled = cancelledOk === true;

      const { data: items } = (await admin
        .from('order_items')
        .select('variant_id, quantity, product_name, variant_name, unit_price_cents')
        .eq('order_id', order.id)) as any;

      restored = (items ?? []).map((i: any) => ({
        variantId: i.variant_id,
        quantity: i.quantity,
        name: i.variant_name || i.product_name,
        priceCents: i.unit_price_cents,
      }));
    }
  }

  return (
    <>
      <main className="mx-auto max-w-xl px-4 py-14 pb-20 safe-bottom text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-800 dark:text-brand-200">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
        </div>

        <h1 className="mt-4 text-2xl font-semibold text-brand-950">Your order was cancelled</h1>
        <p className="mt-2 text-sm text-brand-600">
          {cancelled
            ? 'Nothing has been charged and the stock is back on the products. Your items are waiting in your cart.'
            : 'We have cancelled this order. If you were charged, the amount is released back to your payment method.'}
        </p>

        {order?.order_number && (
          <p className="mt-1 text-sm text-brand-500">
            Order <span className="font-mono">{order.order_number}</span>
          </p>
        )}

        {restored.length > 0 && <RestoreCartOnCancel items={restored} />}

        <div className="mt-6 flex justify-center gap-2">
          <Link href="/cart" className="inline-flex items-center rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-600">
            Back to my cart
          </Link>
          <Link href="/" className="inline-flex items-center rounded-md border border-brand-300 px-4 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50 dark:border-brand-600 dark:text-white dark:hover:bg-brand-800">
            Continue shopping
          </Link>
        </div>

        <p className="mt-6 text-xs text-brand-500">
          Need help? WhatsApp us on{' '}
          <a href={`tel:${brand.contact.phoneLink}`} className="text-accent-700 underline">
            {brand.contact.phone}
          </a>
        </p>
      </main>
    </>
  );
}
