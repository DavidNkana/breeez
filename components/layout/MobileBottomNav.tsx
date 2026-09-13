'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart/store';
import { useMounted } from '@/lib/hooks/use-mounted';

const tabs = [
  { href: '/', label: 'Home', icon: '⌂' }, { href: '/categories', label: 'Shop', icon: '▦' },
  { href: '/account/wishlist', label: 'Wishlist', icon: '♡' }, { href: '/cart', label: 'Cart', icon: '🛒' }, { href: '/account', label: 'You', icon: '◯' },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const count = useCart((s) => s.itemCount());
  const mounted = useMounted();
  return <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:hidden safe-bottom">
    <ul className="mx-auto grid max-w-md grid-cols-5">
      {tabs.map((tab) => { const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href); return <li key={tab.href}>
        <Link href={tab.href} className={`relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] ${active ? 'font-semibold text-accent-600' : 'text-brand-600'}`}>
          <span className="text-xl leading-5" aria-hidden="true">{tab.icon}</span><span>{tab.label}</span>
          {tab.label === 'Cart' && mounted && count > 0 && <span className="absolute right-5 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] text-white">{count}</span>}
        </Link>
      </li>; })}
    </ul>
  </nav>;
}
