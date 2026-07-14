import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function RegisterPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">Create account</h1>
        <p className="mt-2 text-sm text-brand-600">
          Register placeholder. Supabase auth wired in plan Task 12.
        </p>
        <form className="mt-6 space-y-3">
          <input placeholder="Full name" className="w-full rounded-md border border-brand-300 px-3 py-2 text-sm" />
          <input type="email" placeholder="Email" className="w-full rounded-md border border-brand-300 px-3 py-2 text-sm" />
          <input type="password" placeholder="Password (min 8 chars)" className="w-full rounded-md border border-brand-300 px-3 py-2 text-sm" />
          <button type="button" className="w-full rounded-md bg-brand-900 py-2 text-sm font-medium text-white">
            Create account
          </button>
        </form>
      </main>
      <Footer />
    </>
  );
}