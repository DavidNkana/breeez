'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { StarRating } from '@/components/shop/StarRating';

type Review = {
  id: string;
  product_id: string;
  customer_id: string;
  rating: number;
  title: string | null;
  body: string;
  reviewer_display_name: string;
  is_published: boolean;
  is_verified_purchase: boolean;
  created_at: string;
  products?: { name: string; slug: string } | null;
};

type Props = {
  initialReviews: Review[];
};

export function ReviewsManager({ initialReviews }: Props) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const showToast = useToast((s) => s.show);

  async function setPublished(id: string, currentValue: boolean) {
    const next = !currentValue;
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, is_published: next } : r)));
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, isPublished: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update', 'error');
        setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, is_published: currentValue } : r)));
        return;
      }
      showToast(next ? 'Review published' : 'Review hidden', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Network error', 'error');
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, is_published: currentValue } : r)));
    }
  }

  async function destroy(id: string) {
    if (!confirm('Permanently delete this review? This cannot be undone.')) return;
    const backup = reviews;
    setReviews((prev) => prev.filter((r) => r.id !== id));
    try {
      const res = await fetch(`/api/admin/reviews?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to delete', 'error');
        setReviews(backup);
        return;
      }
      showToast('Review deleted.', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Network error', 'error');
      setReviews(backup);
    }
  }

  if (reviews.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-brand-200 bg-brand-50 p-8 text-center">
        <p className="text-brand-700">No reviews to moderate yet.</p>
        <p className="mt-1 text-xs text-brand-500">
          Reviews from verified buyers will appear here. Customers can submit a review
          from any product page after they have placed an order.
        </p>
      </div>
    );
  }

  const published = reviews.filter((r) => r.is_published).length;
  const hidden = reviews.length - published;

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border border-brand-200 bg-white p-4">
          <p className="text-brand-500">Published</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{published}</p>
        </div>
        <div className="rounded-lg border border-brand-200 bg-white p-4">
          <p className="text-brand-500">Hidden</p>
          <p className="mt-1 text-2xl font-semibold text-brand-700">{hidden}</p>
        </div>
      </div>

      <ul className="mt-6 space-y-4">
        {reviews.map((r) => (
          <li
            key={r.id}
            className="rounded-lg border border-brand-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <StarRating value={r.rating} size="sm" />
                  <span className="text-sm font-medium text-brand-900">
                    {r.reviewer_display_name}
                  </span>
                  {r.is_verified_purchase && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Verified
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                      r.is_published
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-brand-200 text-brand-700'
                    }`}
                  >
                    {r.is_published ? 'Live' : 'Hidden'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-brand-500">
                  {new Date(r.created_at).toLocaleString('en-ZA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {r.products?.name && (
                    <>
                      {' '}·{' '}
                      <a
                        href={`/p/${r.products.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-700 hover:underline"
                      >
                        {r.products.name}
                      </a>
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPublished(r.id, r.is_published)}
                >
                  {r.is_published ? 'Hide' : 'Publish'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => destroy(r.id)}>
                  Delete
                </Button>
              </div>
            </div>
            {r.title && (
              <h3 className="mt-3 text-sm font-semibold text-brand-950">{r.title}</h3>
            )}
            <p className="mt-1 text-sm text-brand-800 whitespace-pre-line leading-relaxed">
              {r.body}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
