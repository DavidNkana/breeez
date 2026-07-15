'use client';

import { useWishlist } from '@/lib/wishlist/store';

/**
 * Wishlist heart button. Shows in the header next to the cart.
 * Filled red when current product/variant is in wishlist.
 *
 * Currently shows the count of wishlist items in the badge.
 */
export function WishlistButton() {
  const count = useWishlist((s) => s.items.length);

  return (
    <a
      href="/account/wishlist"
      aria-label={`Wishlist (${count} items)`}
      className="relative rounded-md p-2 text-brand-700 hover:bg-brand-50"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-semibold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </a>
  );
}