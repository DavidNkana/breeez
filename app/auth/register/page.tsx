import Image from 'next/image';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { getLoginNextPath } from '@/lib/auth/redirect';

export default function RegisterPage({ searchParams }: { searchParams?: { next?: string | string[] } }) {
  return (
    <>
      <main className="mx-auto w-full max-w-xl px-4 py-10 pb-24 safe-bottom sm:px-6 sm:py-16">
        <div className="rounded-2xl border border-brand-200 bg-white p-6 shadow-xl dark:border-brand-700 dark:bg-brand-900 sm:p-10">
          <div className="mb-8 flex justify-center rounded-xl bg-black px-4 py-5">
            <Image
              src="/brand/evasale-solo-logo.png"
              alt="Evasale"
              width={224}
              height={156}
              priority
              className="h-12 w-auto"
            />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-950 dark:text-brand-50">Create your account</h1>
          <p className="mt-2 text-sm leading-6 text-brand-600 dark:text-brand-200">Save addresses, track orders, and checkout faster.</p>
          <div className="mt-7">
            <RegisterForm next={getLoginNextPath(searchParams)} />
          </div>
        </div>
      </main>
    </>
  );
}
