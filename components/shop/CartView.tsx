'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart/store';
import { Button } from '@/components/ui/Button';
import { QuantityStepper } from './QuantityStepper';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRand } from '@/lib/format';

export function CartView() {
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart((s) => s.subtotalCents());

  if (items.length === 0) {
    return <EmptyState title="Your cart is empty" description="Add some products to get started." action={{ label: 'Start shopping', href: '/' }} />;
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr,320px]">
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.variantId} className="flex gap-3 rounded-lg border border-brand-200 bg-white p-4">
            {it.imageUrl ? (
              <img src={it.imageUrl} alt={it.name} className="h-24 w-24 flex-shrink-0 rounded object-cover" />
            ) : (
              <div className="h-24 w-24 flex-shrink-0 rounded bg-brand-100" />
            )}
            <div className="flex-1">
              <Link href={`/p/${it.productSlug}`} className="font-medium text-brand-900 hover:underline">
                {it.name}
              </Link>
              <p className="mt-1 text-sm text-brand-700">{formatRand(it.priceCents)}</p>
              <div className="mt-2 flex items-center justify-between">
                <QuantityStepper value={it.quantity} min={1} onChange={(v) => setQuantity(it.variantId, v)} />
                <button onClick={() => remove(it.variantId)} className="text-sm text-brand-500 hover:text-danger">Remove</button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-lg border border-brand-200 bg-white p-4">
        <h2 className="text-sm font-medium text-brand-900">Order summary</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-brand-600">Subtotal</dt><dd className="text-brand-900">{formatRand(subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-600">Shipping</dt><dd className="text-brand-500">at checkout</dd></div>
        </dl>
        <div className="mt-4 border-t border-brand-100 pt-3 flex justify-between font-semibold">
          <span className="text-brand-950">Total</span>
          <span className="text-brand-950">{formatRand(subtotal)}</span>
        </div>
        <div className="mt-4">
          <Link href="/checkout"><Button fullWidth size="lg">Proceed to checkout</Button></Link>
        </div>
        <p className="mt-2 text-center text-xs text-brand-500">Free delivery over R500</p>
      </aside>
    </div>
  );
}