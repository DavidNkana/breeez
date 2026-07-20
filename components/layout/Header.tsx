import Link from 'next/link';
import { CartButton } from '@/components/shop/CartButton';
import { SearchAutocomplete } from '@/components/shop/SearchAutocomplete';
import { WishlistButton } from '@/components/shop/WishlistButton';
import { brand } from '@/lib/brand';

const NAV_LINKS = [
  { href: '/c/apparel',         label: 'Apparel' },
  { href: '/c/kitchen',         label: 'Kitchen' },
  { href: '/c/home-decor',      label: 'Home Decor' },
  { href: '/c/back-to-school',  label: 'Back to School' }
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-brand-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 safe-top">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 sm:gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brand.logo}
            alt={`${brand.name} logo`}
            className="h-7 sm:h-8 md:h-9 w-auto max-w-[55vw]"
          />
        </Link>

        {/* Desktop nav (md+) */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-brand-700 hover:text-brand-950 transition-colors whitespace-nowrap">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 shrink-0">
          <SearchAutocomplete />
          <WishlistButton />
          <Link
            href="/account"
            aria-label="Account"
            className="rounded-md p-1.5 sm:p-2 text-brand-700 hover:bg-brand-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
            </svg>
          </Link>
          <CartButton />
        </div>
      </div>

      {/* Mobile category strip — hidden on desktop where the main nav is visible */}
      <nav aria-label="Categories" className="md:hidden border-t border-brand-100 bg-brand-50 overflow-x-auto no-scrollbar">
        <ul className="flex gap-4 px-4 py-2.5 text-sm whitespace-nowrap">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-brand-700 hover:text-brand-950 transition-colors">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}