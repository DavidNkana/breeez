import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/session';
import { loadOrderReceipt } from '@/lib/orders/receipt';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { OrderRowActions } from '@/components/admin/OrderRowActions';
import { Badge } from '@/components/ui/Badge';
import { formatRand } from '@/lib/format';

type Props = { params: { id: string } };

export const metadata = { title: 'Order — Evasale admin' };

export default async function AdminOrderDetailPage({ params }: Props) {
  await requireUser();
  const admin = await createAdminClient();

  const { data: order } = (await admin
    .from('orders')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()) as any;

  if (!order) notFound();

  const receipt = await loadOrderReceipt(params.id);
  const address = order.shipping_address ?? {};

  return (
    <>
      <main className="mx-auto max-w-4xl px-4 py-8 pb-20 safe-bottom">
        <Link href="/admin/orders" className="text-sm text-brand-600 hover:underline">
          ← Back to orders
        </Link>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-mono text-xl font-semibold text-brand-950">{order.order_number}</h1>
            <p className="mt-0.5 text-sm text-brand-600">
              {new Date(order.created_at).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Johannesburg' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={order.status === 'paid' ? 'success' : 'info'}>
              {(order.status as string).replace(/_/g, ' ')}
            </Badge>
            <OrderRowActions
              order={{
                id: order.id,
                order_number: order.order_number,
                email: order.email,
                status: order.status,
                shipping_method: order.shipping_method,
                shipping_address: order.shipping_address,
              }}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Customer + fulfilment */}
          <section className="rounded-lg border border-brand-200 bg-white p-4 dark:border-brand-800 dark:bg-brand-900">
            <h2 className="text-sm font-semibold text-brand-950">Customer &amp; delivery</h2>
            <dl className="mt-2 space-y-1 text-sm text-brand-700 dark:text-brand-200">
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-brand-500">Email</dt>
                <dd className="break-all">{order.email}</dd>
              </div>
              {address.name && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-brand-500">Name</dt>
                  <dd>{address.name}</dd>
                </div>
              )}
              {address.phone && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-brand-500">Phone</dt>
                  <dd>
                    <a href={`tel:${String(address.phone).replace(/\s/g, '')}`} className="text-accent-700 underline">
                      {address.phone}
                    </a>
                  </dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-brand-500">Address</dt>
                <dd>
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ''}
                  <br />
                  {address.city}, {address.province} {address.postal_code}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-brand-500">Courier</dt>
                <dd>{(order.shipping_method ?? '').replace(/_/g, ' ')} — The Courier Guy</dd>
              </div>
              {order.shipping_tracking && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-brand-500">Tracking</dt>
                  <dd className="font-mono text-xs">{order.shipping_tracking}</dd>
                </div>
              )}
              {order.delivery_building_type && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-brand-500">Place type</dt>
                  <dd>{order.delivery_building_type}</dd>
                </div>
              )}
              {order.delivery_building_name && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-brand-500">Place name</dt>
                  <dd>{order.delivery_building_name}</dd>
                </div>
              )}
              {order.delivery_instructions && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-brand-500">Instructions</dt>
                  <dd className="italic">“{order.delivery_instructions}”</dd>
                </div>
              )}
              {order.door_address_confirmed && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-brand-500">Door</dt>
                  <dd className="text-success">Address confirmed by the customer</dd>
                </div>
              )}
              {(order.driver_tip_cents ?? 0) > 0 && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-brand-500">Driver tip</dt>
                  <dd>{formatRand(order.driver_tip_cents)} ({order.driver_tip_percent}%)</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Money + payment */}
          <section className="rounded-lg border border-brand-200 bg-white p-4 dark:border-brand-800 dark:bg-brand-900">
            <h2 className="text-sm font-semibold text-brand-950">Payment</h2>
            <dl className="mt-2 space-y-1 text-sm text-brand-700 dark:text-brand-200">
              <div className="flex justify-between">
                <dt className="text-brand-500">Subtotal</dt>
                <dd>{formatRand(order.subtotal_cents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-500">Shipping</dt>
                <dd>{order.shipping_cents > 0 ? formatRand(order.shipping_cents) : 'Free'}</dd>
              </div>
              {order.discount_cents > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Discount</dt>
                  <dd>−{formatRand(order.discount_cents)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-brand-100 pt-1 font-semibold text-brand-950 dark:border-brand-800">
                <dt>Total</dt>
                <dd>{formatRand(order.total_cents)}</dd>
              </div>
              <div className="flex gap-2 pt-2">
                <dt className="w-24 shrink-0 text-brand-500">Gateway</dt>
                <dd>{order.payment_gateway ?? '—'}</dd>
              </div>
              {order.payment_reference && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-brand-500">Reference</dt>
                  <dd className="font-mono text-xs">{order.payment_reference}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>

        {order.notes && (
          <section className="mt-6 rounded-lg border border-warning/40 bg-warning/5 p-4">
            <h2 className="text-sm font-semibold text-brand-950">Note from the customer</h2>
            <p className="mt-1 text-sm text-brand-700 dark:text-brand-200">{order.notes}</p>
          </section>
        )}

        {order.delivery_rating && (
          <section className="mt-6 rounded-lg border border-brand-200 bg-white p-4 dark:border-brand-800 dark:bg-brand-900">
            <h2 className="text-sm font-semibold text-brand-950">Delivery rating</h2>
            <p className="mt-1 text-sm text-brand-700 dark:text-brand-200">
              {order.delivery_rating} / 5
              {order.delivery_review_body ? ` — “${order.delivery_review_body}”` : ''}
            </p>
          </section>
        )}

        {/* Items */}
        <section className="mt-6 overflow-hidden rounded-lg border border-brand-200 bg-white dark:border-brand-800 dark:bg-brand-900">
          <h2 className="border-b border-brand-200 px-4 py-3 text-sm font-semibold text-brand-950 dark:border-brand-800">
            Items
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-xs uppercase text-brand-500 dark:bg-brand-800/50">
              <tr>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">SKU</th>
                <th className="px-4 py-2 text-right font-medium">Qty</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100 dark:divide-brand-800">
              {(receipt?.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2">
                    <span className="font-medium text-brand-950">{item.productName}</span>
                    {item.variantName && <span className="block text-xs text-brand-500">{item.variantName}</span>}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-brand-600">{item.sku}</td>
                  <td className="px-4 py-2 text-right">{item.quantity}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatRand(item.lineTotalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Progress */}
        {receipt && (
          <section className="mt-6 rounded-lg border border-brand-200 bg-white p-4 dark:border-brand-800 dark:bg-brand-900">
            <h2 className="mb-3 text-sm font-semibold text-brand-950">Progress</h2>
            <OrderTimeline steps={receipt.timeline} />
          </section>
        )}

        <p className="mt-4 text-xs text-brand-500">
          Setting the status to <strong>processing</strong>, <strong>shipped</strong> or{' '}
          <strong>delivered</strong> emails the customer automatically with a link to their order.
        </p>
      </main>
    </>
  );
}
