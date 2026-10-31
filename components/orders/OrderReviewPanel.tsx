'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { StarPicker, StarRating } from '@/components/shop/StarRating';
import type { OrderReceiptData } from '@/lib/orders/receipt';

type Props = {
  order: OrderReceiptData;
  loggedIn: boolean;
  canRate: boolean;
  deliveryReview: { rating: number; body: string | null } | null;
};

/**
 * The rating panel on the order: a star rating and comment for each item,
 * plus a star rating for the delivery itself.
 *
 * It lives on the order so the customer can rate straight after their
 * parcel arrives, and they can come back to it from "My orders".
 */
export function OrderReviewPanel({ order, loggedIn, canRate, deliveryReview }: Props) {
  const router = useRouter();
  const showToast = useToast((s) => s.show);

  const [itemRatings, setItemRatings] = useState<Record<string, number>>({});
  const [itemBodies, setItemBodies] = useState<Record<string, string>>({});
  const [deliveryRating, setDeliveryRating] = useState(deliveryReview?.rating ?? 0);
  const [deliveryBody, setDeliveryBody] = useState(deliveryReview?.body ?? '');
  const [saving, setSaving] = useState(false);

  if (!loggedIn) {
    return (
      <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm dark:border-brand-800 dark:bg-brand-900">
        <p className="font-medium text-brand-900 dark:text-brand-50">Rate this order</p>
        <p className="mt-1 text-brand-700 dark:text-brand-200">
          Sign in to rate the items and the delivery.
        </p>
      </div>
    );
  }

  if (!canRate) {
    return (
      <div className="rounded-lg border border-brand-200 bg-white p-4 text-sm dark:border-brand-800 dark:bg-brand-900">
        <p className="font-medium text-brand-900 dark:text-brand-50">Rate this order</p>
        <p className="mt-1 text-brand-600 dark:text-brand-300">
          You can rate the items and the delivery once this order has been paid for.
        </p>
        {deliveryReview && (
          <p className="mt-2 text-brand-700 dark:text-brand-200">
            You rated the delivery:{' '}
            <StarRating value={deliveryReview.rating} size="md" />
          </p>
        )}
      </div>
    );
  }

  async function submit() {
    setSaving(true);
    try {
      // Item ratings
      for (const item of order.items) {
        const rating = itemRatings[item.id] ?? item.myReview?.rating;
        if (!rating) continue;
        const body = (itemBodies[item.id] ?? item.myReview?.body ?? '').trim();
        if (!body || body.length < 10) continue;
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: item.productId,
            orderId: order.id,
            orderItemId: item.id,
            rating,
            body,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Could not save the item rating');
        }
      }

      // Delivery rating
      if (deliveryRating > 0) {
        const res = await fetch(`/api/account/orders/${order.id}/delivery-review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: deliveryRating, body: deliveryBody }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Could not save the delivery rating');
        }
      }

      showToast('Thank you for your rating', 'success');
      router.refresh();
    } catch (err: any) {
      showToast(err?.message || 'Could not save your rating', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {order.items.map((item) => (
        <div key={item.id} className="rounded-lg border border-brand-200 bg-white p-4 dark:border-brand-800 dark:bg-brand-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-brand-950">{item.productName}</p>
              {item.variantName && <p className="text-xs text-brand-500">{item.variantName}</p>}
            </div>
            {item.myReview ? (
              <span className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-300">
                <StarRating value={item.myReview.rating} size="md" />
                Rated
              </span>
            ) : (
              <StarPicker
                value={itemRatings[item.id] ?? 0}
                onChange={(v) => setItemRatings((prev) => ({ ...prev, [item.id]: v }))}
                size="md"
              />
            )}
          </div>
          <textarea
            value={itemBodies[item.id] ?? item.myReview?.body ?? ''}
            onChange={(e) => setItemBodies((prev) => ({ ...prev, [item.id]: e.target.value }))}
            rows={2}
            maxLength={1000}
            placeholder="How was it? Size, fit, quality…"
            className="mt-3 w-full rounded-md border border-brand-300 bg-white px-3 py-2 text-sm dark:border-brand-600 dark:bg-brand-950 dark:text-white"
          />
        </div>
      ))}

      {/* Delivery rating */}
      <div className="rounded-lg border border-brand-200 bg-white p-4 dark:border-brand-800 dark:bg-brand-900">
        <p className="text-sm font-medium text-brand-950">How was the delivery?</p>
        <p className="mt-0.5 text-xs text-brand-600 dark:text-brand-300">
          The Courier Guy driver and the delivery experience.
        </p>
        <div className="mt-2">
          <StarPicker value={deliveryRating} onChange={setDeliveryRating} size="md" />
        </div>
        <textarea
          value={deliveryBody}
          onChange={(e) => setDeliveryBody(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Did it arrive on time? Was the driver polite?"
          className="mt-3 w-full rounded-md border border-brand-300 bg-white px-3 py-2 text-sm dark:border-brand-600 dark:bg-brand-950 dark:text-white"
        />
      </div>

      <Button onClick={submit} loading={saving} fullWidth size="lg">
        Save my ratings
      </Button>
    </div>
  );
}
