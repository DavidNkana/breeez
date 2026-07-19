'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { StarPicker, StarRating } from './StarRating';

type Props = {
  productId: string;
  loggedIn: boolean;
  eligibility: { canReview: boolean; reason?: string };
};

/**
 * Client form for writing a review.
 * - If logged out: shows "Sign in" CTA
 * - If logged in but already reviewed or never bought: shows the reason
 * - If logged in and a verified buyer: shows the editor
 */
export function ReviewForm({ productId, loggedIn, eligibility }: Props) {
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loggedIn) {
    return (
      <div className="mt-6 rounded-lg border border-brand-200 bg-brand-50 p-5 text-sm">
        <p className="text-brand-900 font-medium">Want to leave a review?</p>
        <p className="text-brand-700 mt-1">Sign in to your account, then come back to share your experience.</p>
        <div className="mt-3 flex gap-2">
          <a href={`/auth/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`}>
            <Button size="sm">Sign in</Button>
          </a>
          <a href="/auth/register">
            <Button size="sm" variant="secondary">Create account</Button>
          </a>
        </div>
      </div>
    );
  }

  if (!eligibility.canReview) {
    return (
      <div className="mt-6 rounded-lg border border-brand-200 bg-brand-50 p-5 text-sm">
        <p className="text-brand-700">
          <strong className="text-brand-900">Can&apos;t review this product?</strong>{' '}
          {eligibility.reason ?? 'Reviews are only available to verified buyers.'}
        </p>
        {eligibility.reason?.toLowerCase().includes('verified') && (
          <p className="mt-1 text-xs text-brand-600">
            Purchase this product and complete an order to leave a review.
          </p>
        )}
      </div>
    );
  }

  // Verified buyer, ready to write
  if (!open) {
    return (
      <div className="mt-6">
        <Button onClick={() => setOpen(true)} variant="secondary">
          Write a review
        </Button>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim().length < 10) {
      showToast('Please write at least 10 characters.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId, rating, title: title.trim() || undefined, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Could not submit review', 'error');
        return;
      }
      showToast('Thanks — your review is live.', 'success');
      setOpen(false);
      setTitle('');
      setBody('');
      setRating(5);
      router.refresh();
    } catch (err: any) {
      showToast(err?.message || 'Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 rounded-lg border border-brand-200 bg-white p-5 space-y-4"
    >
      <div>
        <p className="text-sm font-medium text-brand-900 mb-2">Your rating</p>
        <div className="flex items-center gap-3">
          <StarPicker value={rating} onChange={setRating} />
          <span className="text-sm text-brand-700">{rating} out of 5</span>
        </div>
      </div>
      <div>
        <label htmlFor="review-title" className="block text-sm font-medium text-brand-900 mb-1">
          Headline <span className="text-brand-500 font-normal">(optional)</span>
        </label>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="What's the most important thing to know?"
        />
      </div>
      <div>
        <label htmlFor="review-body" className="block text-sm font-medium text-brand-900 mb-1">
          Your review <span className="text-red-600">*</span>
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          minLength={10}
          maxLength={2000}
          required
          className="block w-full rounded-md border border-brand-300 bg-white px-3 py-2 text-sm text-brand-900 placeholder:text-brand-400 focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
          placeholder="What did you like or dislike? What did you use this product for?"
        />
        <p className="mt-1 text-xs text-brand-500">
          {body.length} / 2000 characters · minimum 10
        </p>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-brand-500 inline-flex items-center gap-1">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          You&apos;re a verified buyer. Your review will be marked.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Post review
          </Button>
        </div>
      </div>
    </form>
  );
}
