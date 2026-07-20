import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">Sign in</h1>
        <p className="mt-1 text-sm text-brand-600">Welcome back. Sign in to your Trends Day-to-Day account.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-sm">
          <Link href="/auth/forgot-password" className="text-brand-700 hover:underline">
            Forgot your password?
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}