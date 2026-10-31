'use client';

import { useEffect, useRef } from 'react';
import { useCart } from '@/lib/cart/store';

type RestoreItem = {
  variantId: string | null;
  quantity: number;
  name: string;
  priceCents: number;
};

/**
 * Puts the items of a cancelled order back into the cart.
 *
 * The customer walked away from the payment step, so their order was
 * cancelled, the stock was returned to the products and their items are
 * waiting in the cart again.
 */
export function RestoreCartOnCancel({ items }: { items: RestoreItem[] }) {
  const add = useCart((s) => s.add);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    for (const item of items) {
      if (!item.variantId) continue;
      add(
        {
          variantId: item.variantId,
          name: item.name,
          priceCents: item.priceCents,
        } as any,
        item.quantity,
      );
    }
  }, [items, add]);

  return null;
}
