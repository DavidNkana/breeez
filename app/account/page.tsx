import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { requireUser, getCurrentCustomer } from '@/lib/auth/session';
import { LogoutButton } from '@/components/auth/LogoutButton';
import Link from 'next/link';

export default async function AccountPage() {
  const user = await requireUser();
  const customer = await getCurrentCustomer();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-brand-950">
              Hi {customer?.full_name || user.email}
            </h1>
            <p className="mt-1 text-sm text-brand-600">{user.email}</p>
          </div>
          <LogoutButton redirectTo="/" />
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {[
            { label: 'Orders', href: '/account/orders', desc: 'Track and manage your orders' },
            { label: 'Addresses', href: '/account/addresses', desc: 'Manage delivery addresses' },
            { label: 'Wishlist', href: '/account/wishlist', desc: 'Items you saved for later' },
            { label: 'Settings', href: '/account/settings', desc: 'Update your profile' }
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-lg border border-brand-200 bg-white p-4 hover:border-brand-400"
            >
              <p className="font-medium text-brand-900">{card.label}</p>
              <p className="mt-1 text-sm text-brand-600">{card.desc}</p>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}