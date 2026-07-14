'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Minimal cart state — fully implemented in the implementation plan.
 * For now this is the public surface that the CartButton consumes.
 */
export type CartItem = {
  variantId: string;
  productSlug: string;
  name: string;
  priceCents: number;
  quantity: number;
  imageUrl?: string;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  remove: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  clear: () => void;
  itemCount: () => number;
  subtotalCents: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, qty = 1) => {
        const existing = get().items.find((i) => i.variantId === item.variantId);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.variantId === item.variantId ? { ...i, quantity: i.quantity + qty } : i
            )
          });
        } else {
          set({ items: [...get().items, { ...item, quantity: qty }] });
        }
      },
      remove: (variantId) => set({ items: get().items.filter((i) => i.variantId !== variantId) }),
      setQuantity: (variantId, quantity) =>
        set({
          items: get().items
            .map((i) => (i.variantId === variantId ? { ...i, quantity } : i))
            .filter((i) => i.quantity > 0)
        }),
      clear: () => set({ items: [] }),
      itemCount: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
      subtotalCents: () => get().items.reduce((acc, i) => acc + i.priceCents * i.quantity, 0)
    }),
    {
      name: 'breeez.cart',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : (undefined as unknown as Storage)))
    }
  )
);