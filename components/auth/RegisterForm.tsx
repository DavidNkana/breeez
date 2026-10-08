'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { getAuthCallbackUrl, getSafeNextPath } from '@/lib/auth/redirect';
import { getSignupState } from '@/lib/auth/signup';
import { Modal } from '@/components/ui/Modal';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function RegisterForm({ next = '/account' }: { next?: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const showToast = useToast((s) => s.show);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      showToast('Password must be at least 8 characters', 'warning');
      return;
    }
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    setEmail(normalizedEmail);
    const supabase = getSupabase();
    let data: Awaited<ReturnType<ReturnType<typeof getSupabase>['auth']['signUp']>>['data'];
    let error: Awaited<ReturnType<ReturnType<typeof getSupabase>['auth']['signUp']>>['error'];
    try {
      ({ data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: getAuthCallbackUrl(getSafeNextPath(next), window.location.origin)
        }
      }));
    } catch (caught) {
      setLoading(false);
      showToast(caught instanceof Error ? caught.message : 'We could not create your account. Please try again.', 'error');
      return;
    }
    setLoading(false);
    const state = getSignupState({ error, user: data.user, session: data.session });
    if (state === 'error') {
      showToast(error?.message || 'We could not create your account. Please try again.', 'error');
      return;
    }
    if (state === 'authenticated') {
      // Confirm-email-off returns a session. Keep signup low-trust and require
      // the user to sign in normally instead of granting account access here.
      let signOutError: { message: string } | null = null;
      try {
        ({ error: signOutError } = await supabase.auth.signOut({ scope: 'local' }));
      } catch {
        signOutError = { message: 'signout failed' };
      }
      let remainingSession: unknown = null;
      try {
        remainingSession = (await supabase.auth.getSession()).data.session;
      } catch {
        remainingSession = { access_token: 'unknown' };
      }
      if (signOutError || remainingSession) {
        showToast('We could not safely finish signup. Please try again.', 'error');
        return;
      }
      setPassword('');
      setConfirmationEmail(normalizedEmail);
      setShowEmailConfirmation(true);
      return;
    }
    setVerificationSent(true);
  }

  if (showEmailConfirmation) {
    return (
      <Modal open onClose={() => setShowEmailConfirmation(false)} title="Is this your correct email?" size="md">
        <div className="text-brand-950 dark:text-brand-50">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-600">One quick check</p>
          <p className="mt-3 break-all rounded-lg bg-brand-50 px-4 py-3 font-medium text-brand-800 dark:bg-brand-800 dark:text-brand-50">{confirmationEmail}</p>
          <p className="mt-4 text-sm leading-6 text-brand-600 dark:text-brand-200">We will use this address for your Evasale account. You can change it before signing in.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              data-modal-initial-focus
               onClick={() => setShowEmailConfirmation(false)}
            >
              Edit email
            </Button>
            <Button
              type="button"
              fullWidth
               onClick={() => { router.push(`/auth/login?${new URLSearchParams({ registered: '1', email: confirmationEmail, next: getSafeNextPath(next) }).toString()}`); }}
            >
              Yes, continue to login
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (verificationSent) {
    return (
      <div className="rounded-md border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
        We sent a verification email to <strong>{email}</strong>. Click the link in the email to confirm your account, then sign in.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
       <Input label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
       <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
       <Input label="Password (min 8 characters)" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      <Button type="submit" loading={loading} fullWidth size="lg">Create account</Button>
       <p className="text-center text-sm text-brand-600 dark:text-brand-300">
         Already have an account? <Link href={`/auth/login?next=${encodeURIComponent(getSafeNextPath(next))}`} className="text-accent-700 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
