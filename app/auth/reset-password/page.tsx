'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';

function ResetForm() {
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const client = createClient();
    setSupabase(client);
    let mounted = true;

    async function loadSession() {
      // The callback flow stores the recovery session in SSR cookies. The
      // browser client also consumes an implicit-flow hash without exposing it
      // to the server or sending tokens to our API.
      const { data, error } = await client.auth.getSession();
      if (!mounted) return;
      setHasSession(Boolean(data.session) && !error);
      setCheckingSession(false);
    }

    void loadSession();
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setHasSession(Boolean(session));
      setCheckingSession(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

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
    if (checkingSession || !hasSession || !supabase) {
      showToast('Reset link is invalid or expired. Request a new one.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) {
        showToast(error.message || 'Reset failed', 'error');
        return;
      }
      showToast('Password updated. Please sign in.', 'success');
      router.push('/auth/login');
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10 pb-20 safe-bottom">
      <h1 className="text-2xl font-semibold text-brand-950">Choose a new password</h1>
      <p className="mt-1 text-sm text-brand-600">Must be at least 8 characters.</p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        {!checkingSession && !hasSession && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            Reset link is invalid or expired. Request a new one.
          </p>
        )}
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
        <Button type="submit" loading={submitting || checkingSession} fullWidth size="lg" disabled={!hasSession || checkingSession}>
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
