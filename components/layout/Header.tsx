import Link from 'next/link';
import { CartButton } from '@/components/shop/CartButton';
import { SearchBar } from '@/components/shop/SearchBar';

const NAV_LINKS = [
  { href: '/c/apparel',     label: 'Apparel' },
  { href: '/c/kitchen',     label: 'Kitchen' },
  { href: '/c/home-decor',  label: 'Home Decor' },
  { href: '/c/back-to-school', label: 'Back to School' }
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/95 backdrop-blur safe-top">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-900 text-white font-bold">
            B
          </span>
          <span className="text-lg font-semibold tracking-tight text-brand-950">Breeez</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-brand-700 hover:text-brand-950">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <SearchBar />
          <Link
            href="/account"
            aria-label="Account"
            className="rounded-md p-2 text-brand-700 hover:bg-brand-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
            </svg>
          </Link>
          <CartButton />
        </div>
      </div>

      {/* Mobile category strip */}
      <nav className="md:hidden border-t border-brand-100 overflow-x-auto no-scrollbar">
        <ul className="flex gap-4 px-4 py-2 text-sm whitespace-nowrap">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-brand-700 hover:text-brand-950">{l.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}