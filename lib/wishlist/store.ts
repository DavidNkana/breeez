'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type WishlistItem = {
  variantId: string;
  productSlug: string;
  name: string;
  priceCents: number;
  imageUrl?: string;
  addedAt: string;
};

type WishlistState = {
  items: WishlistItem[];
  add: (item: Omit<WishlistItem, 'addedAt'>) => void;
  remove: (variantId: string) => void;
  toggle: (item: Omit<WishlistItem, 'addedAt'>) => boolean;
  has: (variantId: string) => boolean;
  count: () => number;
  clear: () => void;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        if (get().items.some((i) => i.variantId === item.variantId)) return;
        set({ items: [...get().items, { ...item, addedAt: new Date().toISOString() }] });
      },
      remove: (variantId) => set({ items: get().items.filter((i) => i.variantId !== variantId) }),
      toggle: (item) => {
        if (get().items.some((i) => i.variantId === item.variantId)) {
          set({ items: get().items.filter((i) => i.variantId !== item.variantId) });
          return false;
        }
        set({ items: [...get().items, { ...item, addedAt: new Date().toISOString() }] });
        return true;
      },
      has: (variantId) => get().items.some((i) => i.variantId === variantId),
      count: () => get().items.length,
      clear: () => set({ items: [] })
    }),
    {
      name: 'breeez.wishlist',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : (undefined as unknown as Storage)))
    }
  )
);