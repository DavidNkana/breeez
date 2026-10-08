import { requireUser, getCurrentCustomer } from '@/lib/auth/session';
import { LogoutButton } from '@/components/auth/LogoutButton';
import Link from 'next/link';

export default async function AccountPage() {
  const user = await requireUser();
  const customer = await getCurrentCustomer();

  // Display name: full_name first, then email prefix (before @), then email
  const displayName = customer?.full_name || user.email?.split('@')[0] || user.email;
  const initials = String(displayName || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

  return (
    <>
      <main className="mx-auto w-full max-w-4xl px-4 py-10 pb-24 safe-bottom sm:px-6 sm:py-14">
        <section className="rounded-2xl bg-brand-950 p-6 text-white shadow-xl sm:flex sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-4">
            <div aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-500 text-2xl font-semibold uppercase">
              {initials}
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-brand-300">Your account</p>
              <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Hi {displayName}</h1>
              <p className="mt-1 break-all text-sm text-brand-300">{user.email}</p>
            </div>
          </div>
          <div className="mt-6 sm:mt-0"><LogoutButton redirectTo="/" /></div>
        </section>

        <div className="mt-10">
          <h2 className="text-lg font-semibold text-brand-950 dark:text-brand-50">Manage your account</h2>
          <p className="mt-1 text-sm text-brand-600 dark:text-brand-200">Everything you need to shop with ease.</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            { label: 'Orders', href: '/account/orders', desc: 'Track and manage your orders' },
            { label: 'Addresses', href: '/account/addresses', desc: 'Manage delivery addresses' },
            { label: 'Wishlist', href: '/account/wishlist', desc: 'Items you saved for later' },
            { label: 'Settings', href: '/account/settings', desc: 'Update your profile' }
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
               className="group rounded-xl border border-brand-200 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:border-accent-400 dark:bg-brand-900"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold text-brand-900 dark:text-brand-50">{card.label}</p>
                <span aria-hidden="true" className="text-xl text-accent-500 transition-transform group-hover:translate-x-1">→</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-brand-600 dark:text-brand-200">{card.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
