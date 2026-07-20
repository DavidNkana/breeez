import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">Create your Trends Day-to-Day account</h1>
        <p className="mt-1 text-sm text-brand-600">Save addresses, track orders, and checkout faster.</p>
        <div className="mt-6">
          <RegisterForm />
        </div>
      </main>
      <Footer />
    </>
  );
}