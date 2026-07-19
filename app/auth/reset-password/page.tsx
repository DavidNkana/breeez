'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const showToast = useToast((s) => s.show);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    if (pw !== pw2) {
      showToast('Passwords do not match', 'error');
      return;
    }
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!accessToken || !refreshToken) {
      showToast('Reset link is invalid or expired. Request a new one.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accessToken, refreshToken, newPassword: pw }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? 'Reset failed', 'error');
        return;
      }
      showToast('Password updated. Please sign in.', 'success');
      router.push('/auth/login');
    } catch (e: any) {
      showToast(e?.message ?? 'Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10 pb-20 safe-bottom">
      <h1 className="text-2xl font-semibold text-brand-950">Choose a new password</h1>
      <p className="mt-1 text-sm text-brand-600">Must be at least 8 characters.</p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-900" htmlFor="pw">New password</label>
          <Input
            id="pw"
            type="password"
            required
            minLength={8}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-900" htmlFor="pw2">Confirm</label>
          <Input
            id="pw2"
            type="password"
            required
            minLength={8}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" loading={submitting} fullWidth size="lg">
          Update password
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-brand-600">
        <Link href="/auth/forgot-password" className="hover:underline">Request a new link</Link>
      </p>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
