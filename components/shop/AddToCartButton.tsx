'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart/store';
import { Button } from '@/components/ui/Button';
import { QuantityStepper } from './QuantityStepper';
import { useToast } from '@/components/ui/Toast';
import type { ProductVariant } from '@/lib/supabase/types';

type AddToCartButtonProps = {
  productId: string;
  productSlug: string;
  productName: string;
  imageUrl?: string;
  variants: ProductVariant[];
  basePriceCents: number;
  size?: 'sm' | 'md' | 'lg';
};

export function AddToCartButton({ productId, productSlug, productName, imageUrl, variants, basePriceCents, size = 'lg' }: AddToCartButtonProps) {
  const [selectedId, setSelectedId] = useState<string>(variants[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const add = useCart((s) => s.add);
  const showToast = useToast((s) => s.show);

  const selected = variants.find((v) => v.id === selectedId);
  const priceCents = selected?.price_cents ?? basePriceCents;
  const isOutOfStock = !selected || selected.stock === 0;
  const stockCap = selected?.stock ?? 0;

  function handleAdd() {
    if (!selected) return;
    if (quantity > stockCap) {
      showToast(`Only ${stockCap} available`, 'warning');
      return;
    }
    add(
      {
        variantId: selected.id,
        productSlug,
        name: `${productName}${selected.name ? ` — ${selected.name}` : ''}`,
        priceCents,
        imageUrl
      },
      quantity
    );
    showToast(`Added ${quantity} × ${productName} to cart`, 'success');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('breeez:open-cart'));
    }
  }

  return (
    <div className="space-y-3">
      {variants.length > 0 && (
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-md border border-brand-300 bg-white px-3 py-2 text-sm text-brand-950 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          aria-label="Select variant"
        >
          {variants.map((v) => (
            <option key={v.id} value={v.id} disabled={v.stock === 0}>
              {v.name || (v.options && Object.values(v.options).join(' / '))}
              {v.stock === 0 ? ' (out of stock)' : ` — R${((v.price_cents ?? basePriceCents) / 100).toFixed(2)}`}
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center gap-3">
        <QuantityStepper value={quantity} min={1} max={Math.max(1, stockCap)} onChange={setQuantity} />
        <Button onClick={handleAdd} disabled={isOutOfStock} fullWidth size={size} variant="primary">
          {isOutOfStock ? 'Out of stock' : 'Add to cart'}
        </Button>
      </div>
    </div>
  );
}