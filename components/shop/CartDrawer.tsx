'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { QuantityStepper } from './QuantityStepper';
import { useCart } from '@/lib/cart/store';
import { formatRand } from '@/lib/format';

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart((s) => s.subtotalCents());

  useEffect(() => {
    function onOpen() { setOpen(true); }
    window.addEventListener('breeez:open-cart', onOpen);
    return () => window.removeEventListener('breeez:open-cart', onOpen);
  }, []);

  return (
    <Drawer open={open} onClose={() => setOpen(false)} title={`Your cart (${items.length})`}>
      {items.length === 0 ? (
        <div className="p-6 text-center text-sm text-brand-600">
          Your cart is empty.
          <div className="mt-4">
            <Button onClick={() => setOpen(false)} variant="secondary" fullWidth>
              Continue shopping
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <ul className="flex-1 divide-y divide-brand-100 overflow-y-auto">
            {items.map((it) => (
              <li key={it.variantId} className="flex gap-3 p-4">
                {it.imageUrl ? (
                  <img src={it.imageUrl} alt={it.name} className="h-20 w-20 flex-shrink-0 rounded object-cover" />
                ) : (
                  <div className="h-20 w-20 flex-shrink-0 rounded bg-brand-100" />
                )}
                <div className="flex-1 min-w-0">
                  <Link href={`/p/${it.productSlug}`} onClick={() => setOpen(false)} className="text-sm font-medium text-brand-900 line-clamp-2 hover:underline">
                    {it.name}
                  </Link>
                  <p className="mt-1 text-sm text-brand-700">{formatRand(it.priceCents)}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <QuantityStepper
                      value={it.quantity}
                      min={1}
                      onChange={(v) => setQuantity(it.variantId, v)}
                    />
                    <button onClick={() => remove(it.variantId)} className="text-xs text-brand-500 hover:text-danger">
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-brand-100 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-brand-700">Subtotal</span>
              <span className="font-semibold text-brand-950">{formatRand(subtotal)}</span>
            </div>
            <p className="text-xs text-brand-500">Shipping & taxes calculated at checkout</p>
            <Link href="/checkout" onClick={() => setOpen(false)}>
              <Button fullWidth size="lg">Checkout</Button>
            </Link>
            <button onClick={() => setOpen(false)} className="text-sm text-brand-600 hover:underline w-full text-center">
              Continue shopping
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}