'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

type Variant = 'inline' | 'stacked';

/**
 * Compact newsletter signup — matches Breeez brand colors.
 * Variant "inline" is for the footer (single row).
 * Variant "stacked" is for a dedicated section (taller form).
 */
export function NewsletterSignup({ variant = 'inline' }: { variant?: Variant }) {
  const showToast = useToast((s) => s.show);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) {
      showToast('Please enter a valid email', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? 'Subscription failed', 'error');
        return;
      }
      showToast('Thanks — you\'re on the list.', 'success');
      setEmail('');
    } catch (e: any) {
      showToast(e?.message ?? 'Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (variant === 'stacked') {
    return (
      <form onSubmit={submit} className="space-y-2">
        <p className="text-sm font-medium text-brand-950">
          Get 10% off your first order
        </p>
        <p className="text-xs text-brand-600">
          New arrivals, exclusive deals, SA-design news. No spam.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 rounded-md border border-brand-300 bg-white px-3 py-2 text-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
          />
          <Button type="submit" loading={submitting} size="md">
            Subscribe
          </Button>
        </div>
      </form>
    );
  }

  // inline (footer)
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label htmlFor="ns-email" className="text-sm text-brand-700">
        Newsletter:
      </label>
      <input
        id="ns-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="flex-1 rounded-md border border-brand-300 bg-white px-3 py-1.5 text-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
      />
      <Button type="submit" loading={submitting} size="sm">
        Subscribe
      </Button>
    </form>
  );
}
