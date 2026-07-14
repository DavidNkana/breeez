import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">Sign in</h1>
        <p className="mt-2 text-sm text-brand-600">
          Login placeholder. Supabase email + password + magic link wired in plan Task 12.
        </p>
        <form className="mt-6 space-y-3">
          <input type="email" placeholder="Email" className="w-full rounded-md border border-brand-300 px-3 py-2 text-sm" />
          <input type="password" placeholder="Password" className="w-full rounded-md border border-brand-300 px-3 py-2 text-sm" />
          <button type="button" className="w-full rounded-md bg-brand-900 py-2 text-sm font-medium text-white">
            Sign in
          </button>
        </form>
      </main>
      <Footer />
    </>
  );
}