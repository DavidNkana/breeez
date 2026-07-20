'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CartButton } from '@/components/shop/CartButton';
import { SearchAutocomplete } from '@/components/shop/SearchAutocomplete';
import { WishlistButton } from '@/components/shop/WishlistButton';
import { brand } from '@/lib/brand';

const NAV_LINKS = [
  { href: '/',           label: 'Home',       icon: 'home' },
  { href: '/categories', label: 'Categories', icon: 'grid' },
  { href: '/about',      label: 'About',      icon: 'info' },
  { href: '/contact',    label: 'Contact',    icon: 'mail' }
];

function NavIcon({ icon }: { icon: string }) {
  if (icon === 'home') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
  if (icon === 'grid') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
  if (icon === 'info') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
    </svg>
  );
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

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

        <nav className="hidden md:flex items-center">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative inline-flex items-center gap-1.5 px-2.5 pb-2 pt-1 text-sm transition-colors ${
                isActive(l.href)
                  ? 'font-semibold text-accent-600'
                  : 'text-brand-700 hover:text-brand-950'
              }`}
            >
              <NavIcon icon={l.icon} />
              {l.label}
              {isActive(l.href) && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-accent-500" />
              )}
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

      {/* Mobile nav strip */}
      <nav aria-label="Navigation" className="md:hidden border-t border-brand-100 bg-brand-50 overflow-x-auto no-scrollbar">
        <ul className="flex px-4 py-2.5 text-sm whitespace-nowrap">
          {NAV_LINKS.map((l, i) => (
            <li key={l.href} className="flex items-center">
              <Link
                href={l.href}
                className={`px-2 py-1 rounded transition-colors ${
                  isActive(l.href)
                    ? 'font-semibold text-accent-600'
                    : 'text-brand-700 hover:text-brand-950'
                }`}
              >
                <NavIcon icon={l.icon} />
                <span className="ml-1">{l.label}</span>
              </Link>
              {i < NAV_LINKS.length - 1 && (
                <span className="mx-1 text-brand-300" aria-hidden="true">·</span>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
