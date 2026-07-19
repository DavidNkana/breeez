'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export default function ForgotPasswordPage() {
  const showToast = useToast((s) => s.show);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, redirectTo: `${window.location.origin}/auth/reset-password` }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? 'Failed to send reset email', 'error');
        return;
      }
      setSent(true);
      showToast('If that email exists, a reset link is on its way.', 'success');
    } catch (e: any) {
      showToast(e?.message ?? 'Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10 pb-20 safe-bottom">
      <h1 className="text-2xl font-semibold text-brand-950">Reset your password</h1>
      <p className="mt-1 text-sm text-brand-600">
        Enter the email on your account. We&apos;ll send you a link to set a new password.
      </p>

      {sent ? (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm">
          <p className="font-medium text-emerald-900">Check your inbox.</p>
          <p className="mt-1 text-emerald-800">
            If an account exists for <span className="font-medium">{email}</span>, we&apos;ve emailed a reset link.
            The link expires in 1 hour.
          </p>
          <Link href="/auth/login" className="mt-3 inline-block text-emerald-900 underline hover:text-emerald-700">
            Back to sign in →
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-900" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <Button type="submit" loading={submitting} fullWidth size="lg">
            Send reset link
          </Button>
          <p className="text-center text-sm text-brand-600">
            <Link href="/auth/login" className="hover:underline">Back to sign in</Link>
          </p>
        </form>
      )}
    </main>
  );
}
