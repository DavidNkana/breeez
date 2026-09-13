'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart/store';
import { useWishlist } from '@/lib/wishlist/store';
import { useMounted } from '@/lib/hooks/use-mounted';

const tabs = [
  { href: '/', label: 'Home', icon: '⌂' }, { href: '/categories', label: 'Shop', icon: '▦' },
  { href: '/account/wishlist', label: 'Wishlist', icon: '♡' }, { href: '/cart', label: 'Cart', icon: '🛒' }, { href: '/account', label: 'You', icon: '◯' },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const count = useCart((s) => s.itemCount());
  const wishlistCount = useWishlist((s) => s.count());
  const mounted = useMounted();
  return <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-200 dark:border-brand-800 bg-white/95 dark:bg-brand-950/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-brand-950/80 md:hidden safe-bottom">
    <ul className="mx-auto grid max-w-md grid-cols-5">
      {tabs.map((tab) => { const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href); return <li key={tab.href}>
        <Link href={tab.href} className={`relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] ${active ? 'font-semibold text-accent-600 dark:text-accent-400' : 'text-brand-600 dark:text-brand-300'}`}>
          <span className="relative text-xl leading-5" aria-hidden="true">{tab.icon}
            {tab.label === 'Wishlist' && mounted && wishlistCount > 0 && <span className="absolute -right-2 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-normal text-white">{wishlistCount}</span>}
            {tab.label === 'Cart' && mounted && count > 0 && <span className="absolute -right-2 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-normal text-white">{count}</span>}
          </span><span>{tab.label}</span>
        </Link>
      </li>; })}
    </ul>
  </nav>;
}
