'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { brand } from '@/lib/brand';

type Props = {
  /** Optional initial email (we prefill when the caller was signed in and
   *  clicked the in-app delete button). The user still has to type password. */
  initialEmail?: string;
};

type Stage = 'form' | 'deleting' | 'done';

/**
 * Self-service account deletion page.
 *
 * Apple App Store guideline 5.1.1(v) requires that the user be able to delete
 * their account without contacting support. This page lets them do it:
 *
 *   1. They enter the email they signed up with AND re-type their password.
 *      We re-auth even if the user is already signed in, to protect against
 *      stolen-cookie deletion.
 *   2. They tick a confirmation checkbox acknowledging the deletion is
 *      permanent (no undo). Without this, a stray tap on the button could
 *      destroy their account.
 *   3. They tap "Permanently delete my account".
 *   4. We POST /api/account/delete. The server re-verifies the password
 *      and runs the account_delete() RPC, which:
 *        - anonymizes order PII (email, name, phone, address)
 *        - deletes auth.users (cascade wipes customers, wishlist, carts, etc.)
 *   5. On success we show a thank-you message and link them back to the
 *      storefront.
 *
 * No "email us" anywhere. The contact details shown are FOR REFERENCE only
 * (in case they want to ask a question about the policy BEFORE deleting),
 * not as a step in the deletion flow itself.
 */
export default function DeleteAccountPage({ initialEmail }: Props) {
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [stage, setStage] = useState<Stage>('form');
  const [error, setError] = useState<string | null>(null);
  const supportEmail = brand.contact.email;

  // Once deletion succeeds, clear any browser session cookie so a refreshed
  // page doesn't try to re-auth the now-deleted user. We can't fully sign
  // out the in-app session because the in-app tab is on a different origin
  // than this page — but we can clear the cookies we know about.
  useEffect(() => {
    if (stage === 'done') {
      // Best-effort: clear any sb- cookies (Supabase auth cookies).
      try {
        document.cookie.split(';').forEach((c) => {
          const name = c.split('=')[0].trim();
          if (name.startsWith('sb-') || name.startsWith('supabase-')) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          }
        });
      } catch {
        // Ignore — not all browsers/cookies are clearable from JS.
      }
    }
  }, [stage]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (stage !== 'form') return;
    if (!confirm) {
      setError('Please confirm that you understand this is permanent.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Email and password are both required.');
      return;
    }
    setError(null);
    setStage('deleting');

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data?.ok) {
        setStage('form');
        setError(
          data?.error ||
            'We couldn\u2019t complete the deletion. Please try again.'
        );
        return;
      }
      setStage('done');
      showToast('Your account has been deleted.', 'success');
    } catch {
      setStage('form');
      setError('Network error. Please check your connection and try again.');
    }
  }

  // ----- Stage: confirmation -----------------------------------------------
  if (stage === 'done') {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-10 pb-20 safe-bottom">
          <div className="rounded-lg border border-brand-200 bg-white p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-green-700"
                aria-hidden="true"
              >
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-brand-950">Your account is deleted</h1>
            <p className="mt-2 text-sm text-brand-700">
              We&apos;ve permanently removed your account, your sign-in, your addresses,
              your wishlist, and your cart. Order records needed for tax compliance
              have been kept, but with all personal details removed.
            </p>
            <p className="mt-4 text-sm text-brand-600">
              If you ever want to shop with us again, you&apos;ll need to create a fresh
              account. We won&apos;t be able to recover this one.
            </p>
            <div className="mt-6 flex gap-2">
              <a
                href="/"
                className="inline-flex items-center rounded-md bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Back to home
              </a>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // ----- Stage: deleting (in-flight) --------------------------------------
  if (stage === 'deleting') {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-10 pb-20 safe-bottom">
          <div className="rounded-lg border border-brand-200 bg-white p-6 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" aria-hidden="true" />
            <p className="mt-4 text-sm text-brand-700">
              Deleting your account&hellip;
            </p>
            <p className="mt-1 text-xs text-brand-500">
              This usually takes a few seconds.
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // ----- Stage: form ------------------------------------------------------
  const canSubmit = !!email.trim() && !!password && confirm && stage === 'form';

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-3xl font-semibold text-brand-950">Delete your account</h1>
        <p className="mt-2 text-base text-brand-700">
          This deletes your account, your sign-in, your saved addresses, your wishlist,
          your cart, and your product reviews. Order records needed for South African
          tax compliance are kept, but with all personal details removed so they can&apos;t
          be linked back to you.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={stage !== 'form'}
            required
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Re-enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText="We ask for your password again so that no one else can delete your account if your device is lost."
            disabled={stage !== 'form'}
            required
          />

          <label className="flex items-start gap-3 rounded-md border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-brand-300 text-brand-900 focus:ring-accent-500"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              disabled={stage !== 'form'}
            />
            <span>
              I understand my account and all data above will be permanently deleted, and
              this <strong>cannot be undone</strong>.
            </span>
          </label>

          {error && (
            <p className="rounded-md border border-danger bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="submit"
              size="lg"
              disabled={!canSubmit}
              className="!bg-danger hover:!bg-red-700 focus-visible:!ring-red-700"
            >
              Permanently delete my account
            </Button>
            <a
              href="/account"
              className="text-sm text-brand-600 hover:underline"
            >
              Cancel and go back
            </a>
          </div>
        </form>

        <section className="mt-10 rounded-lg border border-brand-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-brand-950">Questions before you delete?</h2>
          <p className="mt-2 text-sm text-brand-700">
            We&apos;re happy to explain what gets deleted or what we keep, but we don&apos;t
            require you to contact us to delete. The button above does it now.
          </p>
          <p className="mt-3 text-sm text-brand-700">
            For reference only: our support email is{' '}
            <a href={`mailto:${supportEmail}`} className="text-accent-700 underline hover:text-accent-800">
              {supportEmail}
            </a>.
          </p>
        </section>

        <p className="mt-8 text-xs text-brand-400">
          This page exists to satisfy Apple App Store guideline 5.1.1(v) and
          Google Play User Data Policy. It is reachable from the in-app
          Settings screen under &quot;Delete my account&quot;.
        </p>
      </main>
      <Footer />
    </>
  );
}
