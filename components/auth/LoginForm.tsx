'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { getAuthCallbackUrl, getSafeNextPath } from '@/lib/auth/redirect';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function LoginForm({ next = '/account', initialEmail = '' }: { next?: string; initialEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const showToast = useToast((s) => s.show);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      setEmail(normalizedEmail);
      const { error } = await getSupabase().auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) {
        showToast(error.message, 'error');
        return;
      }
      showToast('Welcome back!', 'success');
      const safeNext = getSafeNextPath(next);
      router.push(safeNext);
      router.refresh();
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'We could not sign you in. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function onMagicLink() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      showToast('Enter your email first', 'warning');
      return;
    }
    setEmail(normalizedEmail);
    setLoading(true);
    try {
      const { error } = await getSupabase().auth.signInWithOtp({
        email: normalizedEmail,
        options: { emailRedirectTo: getAuthCallbackUrl(next, window.location.origin) }
      });
      if (error) {
        showToast(error.message, 'error');
        return;
      }
      setMagicLinkSent(true);
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'We could not send the magic link. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (magicLinkSent) {
    return (
      <div className="rounded-md border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
        Magic link sent. Check your email and click the link to sign in.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label="Email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <Input
        label="Password"
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" loading={loading} fullWidth size="lg">Sign in</Button>
       <button type="button" onClick={onMagicLink} className="text-sm text-brand-600 dark:text-brand-300 hover:underline w-full text-center">
        Or email me a magic link
      </button>
       <p className="text-center text-sm text-brand-600 dark:text-brand-300">
         New to Evasale? <Link href={`/auth/register?next=${encodeURIComponent(getSafeNextPath(next))}`} className="text-accent-700 hover:underline">Create an account</Link>
      </p>
    </form>
  );
}
