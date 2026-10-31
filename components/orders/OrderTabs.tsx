'use client';

import { useState } from 'react';
import {
  OrderItemsSection,
  OrderDeliverySection,
  OrderPaymentSection,
  OrderProgressSection,
} from '@/components/orders/OrderReceipt';
import { OrderReviewPanel } from '@/components/orders/OrderReviewPanel';
import type { OrderReceiptData } from '@/lib/orders/receipt';

type Tab = 'overview' | 'items' | 'delivery' | 'payment' | 'rate';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'items', label: 'Items' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'payment', label: 'Payment' },
  { key: 'rate', label: 'Rate' },
];

type Props = {
  order: OrderReceiptData;
  loggedIn: boolean;
  canRate: boolean;
  deliveryReview: { rating: number; body: string | null } | null;
  trackingHref?: string;
  showEmail?: boolean;
};

/**
 * The order view, in tabs: overview, items, delivery, payment and the
 * rating panel. The customer sees the invoice and can rate the order and
 * the delivery without leaving the page.
 */
export function OrderTabs({ order, loggedIn, canRate, deliveryReview, trackingHref, showEmail }: Props) {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-brand-200 dark:border-brand-800" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={[
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
              tab === t.key
                ? 'border-accent-500 text-brand-950 dark:text-brand-50'
                : 'border-transparent text-brand-500 hover:text-brand-800',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <OrderProgressSection order={order} trackingHref={trackingHref} />
          <OrderItemsSection order={order} />
          <OrderDeliverySection order={order} />
          <OrderPaymentSection order={order} showEmail={showEmail} />
        </div>
      )}
      {tab === 'items' && <OrderItemsSection order={order} />}
      {tab === 'delivery' && <OrderDeliverySection order={order} />}
      {tab === 'payment' && <OrderPaymentSection order={order} showEmail={showEmail} />}
      {tab === 'rate' && (
        <OrderReviewPanel order={order} loggedIn={loggedIn} canRate={canRate} deliveryReview={deliveryReview} />
      )}
    </div>
  );
}
