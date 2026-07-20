import Link from 'next/link';
import { CartButton } from '@/components/shop/CartButton';
import { SearchAutocomplete } from '@/components/shop/SearchAutocomplete';
import { WishlistButton } from '@/components/shop/WishlistButton';
import { brand } from '@/lib/brand';

const NAV_LINKS = [
  { href: '/categories', label: 'Categories' },
  { href: '/about',      label: 'About' },
  { href: '/contact',    label: 'Contact' }
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 safe-top">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 sm:gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brand.logo}
            alt={`${brand.name} logo`}
            className="h-8 sm:h-9 w-auto"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex items-center gap-1.5 text-sm text-brand-700 hover:text-brand-950 transition-colors">
              {l.href === '/categories' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
              )}
              {l.href === '/about' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                </svg>
              )}
              {l.href === '/contact' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                </svg>
              )}
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <SearchAutocomplete />
          <WishlistButton />
          <Link
            href="/account"
            aria-label="Account"
            className="rounded-md p-2 text-brand-700 hover:bg-brand-50"
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