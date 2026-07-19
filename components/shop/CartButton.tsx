'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/lib/cart/store';

/**
 * Cart button in the header — opens the cart drawer.
 *
 * IMPORTANT: Zustand `persist` reads from localStorage on client mount, AFTER initial render.
 * To avoid React #418 hydration mismatch (server sees count=0, client sees count=N),
 * we render an empty badge during SSR + first client render, then update after mount.
 */
export function CartButton() {
  const count = useCart((s) => s.itemCount());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const displayCount = mounted ? count : 0;

  return (
    <button
      type="button"
      aria-label={`Cart (${count} items)`}
      className="relative rounded-md p-2 text-brand-700 hover:bg-brand-50"
      onClick={() => {
        // Open cart drawer — implemented in plan Task 14
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('breeez:open-cart'));
        }
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3h2l2 13h12l2-9H6" />
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="17" cy="20" r="1.5" />
      </svg>
      {displayCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-semibold text-white">
          {displayCount}
        </span>
      )}
    </button>
  );
}