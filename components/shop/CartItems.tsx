'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart/store';
import { formatRand } from '@/lib/format';
import { brand } from '@/lib/brand';
import { QuantityStepper } from './QuantityStepper';

export function ShippingProgress({ subtotal }: { subtotal: number }) {
  const threshold = brand.freeShippingThresholdCents;
  const remaining = Math.max(0, threshold - subtotal);
  const progress = Math.min(100, (subtotal / threshold) * 100);
  return <div className="rounded-md bg-brand-50 p-3 text-xs text-brand-700">
    <p>{remaining > 0 ? `You’re ${formatRand(remaining)} away from free shipping` : 'You’ve unlocked free shipping!'}</p>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-200"><div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${progress}%` }} /></div>
  </div>;
}

export function CartItems({ drawer = false, onNavigate }: { drawer?: boolean; onNavigate?: () => void }) {
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  return <ul className={drawer ? 'flex-1 divide-y divide-brand-100 overflow-y-auto px-2' : 'space-y-3'}>
    {items.map((it) => <li key={it.variantId} className={drawer ? 'flex gap-3 px-3 py-4' : 'flex gap-3 rounded-lg border border-brand-200 bg-white p-4'}>
      {it.imageUrl ? <img src={it.imageUrl} alt={it.name} className={`${drawer ? 'h-20 w-20' : 'h-24 w-24'} flex-shrink-0 rounded object-cover`} /> : <div className={`${drawer ? 'h-20 w-20' : 'h-24 w-24'} flex-shrink-0 rounded bg-brand-100`} />}
      <div className="min-w-0 flex-1"><Link href={`/p/${it.productSlug}`} onClick={onNavigate} className="font-medium text-brand-900 hover:underline">{it.name}</Link>
        <p className="mt-1 text-sm text-brand-700">{formatRand(it.priceCents)}</p>
        <div className="mt-2 flex items-center justify-between"><QuantityStepper value={it.quantity} min={1} onChange={(v) => setQuantity(it.variantId, v)} /><button onClick={() => remove(it.variantId)} className="text-xs text-brand-500 hover:text-danger">Remove</button></div>
      </div>
    </li>)}
  </ul>;
}
