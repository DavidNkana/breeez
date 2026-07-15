import Link from 'next/link';

const FOOTER_COLUMNS = [
  {
    title: 'Shop',
    links: [
      { href: '/c/apparel', label: 'Apparel' },
      { href: '/c/kitchen', label: 'Kitchen' },
      { href: '/c/home-decor', label: 'Home Decor' },
      { href: '/c/bathroom', label: 'Bathroom' },
      { href: '/c/bedroom', label: 'Bedroom' }
    ]
  },
  {
    title: 'Account',
    links: [
      { href: '/auth/login', label: 'Sign in' },
      { href: '/auth/register', label: 'Register' },
      { href: '/account/orders', label: 'My orders' },
      { href: '/account/wishlist', label: 'Wishlist' }
    ]
  },
  {
    title: 'Help',
    links: [
      { href: '/legal/returns', label: 'Returns' },
      { href: '/legal/shipping', label: 'Shipping' },
      { href: '/contact', label: 'Contact us' }
    ]
  },
  {
    title: 'Legal',
    links: [
      { href: '/legal/terms', label: 'Terms' },
      { href: '/legal/privacy', label: 'Privacy (POPIA)' }
    ]
  }
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-brand-200 bg-brand-50">
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 md:gap-10">
          <div className="sm:col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-900 text-white font-bold">B</span>
              <span className="text-lg font-semibold tracking-tight text-brand-950">Breeez</span>
            </Link>
            <p className="mt-3 text-sm text-brand-600 leading-relaxed max-w-xs">
              South African multi-category ecommerce. Apparel, home, kitchen, school and more — delivered nationwide.
            </p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-brand-900 mb-3">{col.title}</p>
              <ul className="space-y-2 text-sm text-brand-600">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-brand-900 hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-brand-200">
        <div className="mx-auto max-w-6xl px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-brand-500">
          <p>© {new Date().getFullYear()} Breeez. Prices in ZAR. POPIA-compliant.</p>
          <p>Made in South Africa 🇿🇦</p>
        </div>
      </div>
    </footer>
  );
}