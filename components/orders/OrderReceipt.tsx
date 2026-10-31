import Image from 'next/image';
import { formatRand } from '@/lib/format';
import type { OrderReceiptData, TimelineStep } from '@/lib/orders/receipt';
import { OrderTimeline } from '@/components/orders/OrderTimeline';

export function OrderItemsSection({ order }: { order: OrderReceiptData }) {
  return (
    <section className="overflow-hidden rounded-lg border border-brand-200 bg-white dark:border-brand-800 dark:bg-brand-900">
      <h2 className="border-b border-brand-200 px-4 py-3 text-sm font-semibold text-brand-950 dark:border-brand-800">
        What you ordered
      </h2>
      <ul className="divide-y divide-brand-100 dark:divide-brand-800">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-3 px-4 py-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-brand-100 dark:bg-brand-800">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.productName} fill sizes="64px" className="object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-brand-950">{item.productName}</p>
              {item.variantName && <p className="text-xs text-brand-600 dark:text-brand-300">{item.variantName}</p>}
              <p className="mt-0.5 text-xs text-brand-500">SKU {item.sku}</p>
              <p className="mt-1 text-xs text-brand-600">
                {item.quantity} × {formatRand(item.unitPriceCents)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-brand-950">{formatRand(item.lineTotalCents)}</p>
          </li>
        ))}
      </ul>
      <dl className="space-y-1.5 border-t border-brand-200 px-4 py-3 text-sm dark:border-brand-800">
        <div className="flex justify-between text-brand-600">
          <dt>Subtotal</dt>
          <dd>{formatRand(order.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between text-brand-600">
          <dt>Delivery</dt>
          <dd>{order.shippingCents > 0 ? formatRand(order.shippingCents) : 'Free'}</dd>
        </div>
        {order.driverTipCents > 0 && (
          <div className="flex justify-between text-brand-600">
            <dt>Driver tip</dt>
            <dd>{formatRand(order.driverTipCents)}</dd>
          </div>
        )}
        {order.discountCents > 0 && (
          <div className="flex justify-between text-success">
            <dt>Discount</dt>
            <dd>−{formatRand(order.discountCents)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-brand-100 pt-2 text-base font-semibold text-brand-950 dark:border-brand-800">
          <dt>Total</dt>
          <dd>{formatRand(order.totalCents)}</dd>
        </div>
      </dl>
    </section>
  );
}

export function OrderDeliverySection({ order }: { order: OrderReceiptData }) {
  const address = order.shippingAddress ?? {};
  const hasAddress = Boolean(address.line1 || address.address_line1);
  return (
    <section className="rounded-lg border border-brand-200 bg-white p-4 dark:border-brand-800 dark:bg-brand-900">
      <h2 className="text-sm font-semibold text-brand-950">Delivery</h2>
      <dl className="mt-2 space-y-1 text-sm text-brand-700 dark:text-brand-200">
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-brand-500">Method</dt>
          <dd>{(order.shippingMethod ?? '').replace(/_/g, ' ')} — The Courier Guy</dd>
        </div>
        {hasAddress && (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-brand-500">Address</dt>
            <dd className="min-w-0">
              {address.name ? `${address.name}, ` : ''}
              {address.building_name ? `${address.building_name}, ` : ''}
              {address.line1 ?? address.address_line1}
              {address.line2 ?? address.address_line2 ? `, ${address.line2 ?? address.address_line2}` : ''}
              <br />
              {address.city ? `${address.city}, ` : ''}
              {address.province ? `${address.province} ` : ''}
              {address.postal_code ?? address.postalCode}
              {address.phone ? (
                <>
                  <br />
                  <span className="text-brand-500">{address.phone}</span>
                </>
              ) : null}
            </dd>
          </div>
        )}
        {address.building_type && (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-brand-500">Place type</dt>
            <dd>{address.building_type}</dd>
          </div>
        )}
        {order.deliveryInstructions && (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-brand-500">Instructions</dt>
            <dd className="italic">“{order.deliveryInstructions}”</dd>
          </div>
        )}
        {order.shippingTracking && (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-brand-500">Tracking</dt>
            <dd className="font-mono text-xs">{order.shippingTracking}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

export function OrderPaymentSection({ order, showEmail = false }: { order: OrderReceiptData; showEmail?: boolean }) {
  return (
    <section className="rounded-lg border border-brand-200 bg-white p-4 dark:border-brand-800 dark:bg-brand-900">
      <h2 className="text-sm font-semibold text-brand-950">Payment</h2>
      <dl className="mt-2 space-y-1 text-sm text-brand-700 dark:text-brand-200">
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-brand-500">Method</dt>
          <dd>
            {order.paymentGateway === 'payfast'
              ? 'PayFast'
              : order.paymentGateway === 'payjustnow'
                ? 'PayJustNow'
                : (order.paymentGateway ?? '—')}
          </dd>
        </div>
        {order.paymentReference && (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-brand-500">Reference</dt>
            <dd className="font-mono text-xs">{order.paymentReference}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-brand-500">Status</dt>
          <dd className="capitalize">{order.status.replace(/_/g, ' ')}</dd>
        </div>
        {showEmail && (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-brand-500">Receipt sent to</dt>
            <dd className="break-all">{order.email}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

export function OrderProgressSection({ order, trackingHref }: { order: OrderReceiptData; trackingHref?: string }) {
  return (
    <section className="rounded-lg border border-brand-200 bg-white p-4 dark:border-brand-800 dark:bg-brand-900">
      <h2 className="mb-3 text-sm font-semibold text-brand-950">Order progress</h2>
      <OrderTimeline steps={order.timeline} />
      {trackingHref && (
        <a
          href={trackingHref}
          className="mt-3 inline-flex items-center rounded-md border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-900 hover:bg-brand-50 dark:border-brand-600 dark:text-white dark:hover:bg-brand-800"
        >
          Track this order
        </a>
      )}
    </section>
  );
}

export function OrderReceipt({
  order,
  trackingHref,
  showEmail = false,
}: {
  order: OrderReceiptData;
  trackingHref?: string;
  showEmail?: boolean;
}) {
  return (
    <div className="space-y-6 text-left">
      <OrderItemsSection order={order} />
      <OrderDeliverySection order={order} />
      <OrderPaymentSection order={order} showEmail={showEmail} />
      <OrderProgressSection order={order} trackingHref={trackingHref} />
    </div>
  );
}
