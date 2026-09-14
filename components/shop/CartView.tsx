'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart/store';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRand } from '@/lib/format';
import { CartItems, ShippingProgress } from './CartItems';

export function CartView() {
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotalCents());
  if (!items.length) return <EmptyState title="Your cart is empty" description="Add some products to get started." action={{ label: 'Start shopping', href: '/' }} />;
  return <div className="grid gap-6 md:grid-cols-[1fr,320px]"><CartItems /><aside className="h-fit rounded-lg border border-brand-200 bg-white dark:border-brand-700 dark:bg-brand-900 p-4"><h2 className="text-sm font-medium text-brand-900 dark:text-brand-50">Order summary</h2><div className="mt-3"><ShippingProgress subtotal={subtotal} /></div><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-brand-600 dark:text-brand-300">Subtotal</dt><dd className="text-brand-900 dark:text-brand-50">{formatRand(subtotal)}</dd></div><div className="flex justify-between"><dt className="text-brand-600 dark:text-brand-300">Shipping</dt><dd className="text-brand-500 dark:text-brand-400">at checkout</dd></div></dl><div className="mt-4 flex justify-between border-t border-brand-100 pt-3 font-semibold"><span>Total</span><span>{formatRand(subtotal)}</span></div><div className="mt-4"><Link href="/checkout"><Button fullWidth size="lg">Proceed to checkout</Button></Link></div><p className="mt-2 text-center text-xs text-brand-500 dark:text-brand-400">13 Days Return Policy</p></aside></div>;
}
