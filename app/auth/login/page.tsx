import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { getLoginNextPath } from '@/lib/auth/redirect';
import { getSafeEmailPrefill } from '@/lib/auth/signup';

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string | string[]; registered?: string | string[]; email?: string | string[] };
}) {
  const registered = Array.isArray(searchParams?.registered) ? searchParams.registered[0] : searchParams?.registered;
  const initialEmail = getSafeEmailPrefill(searchParams?.email);
  return (
    <>
      <main className="mx-auto w-full max-w-xl px-4 py-10 pb-24 safe-bottom sm:px-6 sm:py-16">
        <div className="rounded-2xl border border-brand-200 bg-white p-6 shadow-xl dark:border-brand-700 dark:bg-brand-900 sm:p-10">
          <div className="mb-8 flex justify-center rounded-xl bg-black px-4 py-5">
            <img src="/brand/evasale-solo-logo.png" alt="Evasale" className="h-12 w-auto" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-950 dark:text-brand-50">Sign in</h1>
          <p className="mt-2 text-sm leading-6 text-brand-600 dark:text-brand-200">Welcome back. Sign in to your Evasale account.</p>
          {registered === '1' && (
          <div role="status" className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100">
            <p className="font-semibold">Your account has been created.</p>
            <p className="mt-1">Welcome to Evasale. Sign in to continue.</p>
          </div>
          )}
          <div className={registered === '1' ? 'mt-5' : 'mt-7'}>
            <LoginForm next={getLoginNextPath(searchParams)} initialEmail={initialEmail} />
          </div>
          <p className="mt-6 text-center text-sm">
            <Link href="/auth/forgot-password" className="font-medium text-accent-700 hover:underline dark:text-accent-300">
              Forgot your password?
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
