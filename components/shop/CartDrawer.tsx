'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/lib/cart/store';
import { formatRand } from '@/lib/format';
import { CartItems, ShippingProgress } from './CartItems';

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotalCents());

  useEffect(() => {
    function onOpen() { setOpen(true); }
    window.addEventListener('breeez:open-cart', onOpen);
    return () => window.removeEventListener('breeez:open-cart', onOpen);
  }, []);

  return (
    <Drawer open={open} onClose={() => setOpen(false)} title={`Your cart (${items.length})`}>
      {items.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-brand-600">
          Your cart is empty.
          <div className="mt-6">
            <Button onClick={() => setOpen(false)} variant="secondary" fullWidth>
              Continue shopping
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col">
           <CartItems drawer onNavigate={() => setOpen(false)} />

          <div className="border-t border-brand-100 px-5 py-5 pb-6 space-y-3 safe-bottom">
            <div className="flex justify-between text-sm">
              <span className="text-brand-700">Subtotal</span>
              <span className="font-semibold text-brand-950">{formatRand(subtotal)}</span>
            </div>
            <ShippingProgress subtotal={subtotal} />
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
