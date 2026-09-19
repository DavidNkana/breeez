'use client';

import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/lib/cart/store';
import { Button } from '@/components/ui/Button';
import { QuantityStepper } from './QuantityStepper';
import { useToast } from '@/components/ui/Toast';
import { useCartFly } from './CartFly';
import type { ProductVariant } from '@/lib/supabase/types';
import { canAddVariantToCart, getAvailableStock, getVariantDisplayName } from '@/lib/catalog/variant-options';

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
  const { fly } = useCartFly();
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!variants.some((variant) => variant.id === selectedId)) {
      setSelectedId(variants[0]?.id ?? '');
      setQuantity(1);
    }
  }, [variants, selectedId]);

  const selected = variants.find((v) => v.id === selectedId);
  const priceCents = selected?.price_cents ?? basePriceCents;
  const stockCap = getAvailableStock(selected?.stock);
  const isOutOfStock = !selected || stockCap <= 0;

  function handleAdd() {
    if (!selected || stockCap <= 0) return;
    if (!canAddVariantToCart(selected, quantity)) {
      if (quantity > stockCap) showToast(`Only ${stockCap} available`, 'warning');
      return;
    }
    // Capture rect of the add-to-cart button before the cart drawer opens
    const fromRect = btnRef.current?.getBoundingClientRect();

    add(
      {
        variantId: selected.id,
        productSlug,
        name: `${productName} — ${getVariantDisplayName(selected)}`,
        priceCents,
        imageUrl
      },
      quantity
    );
    showToast(`Added ${quantity} × ${productName} to cart`, 'success');

    if (fromRect && imageUrl) {
      // Find the cart icon to land on
      const toEl = document.querySelector<HTMLElement>('[data-cart-icon]');
      const toRect = toEl?.getBoundingClientRect();
      if (toRect) {
        fly({ imageUrl, fromRect, toRect });
      }
    }

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
          className="w-full rounded-md border border-brand-300 bg-white px-3 py-2 text-sm text-brand-950 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-brand-600 dark:bg-brand-900 dark:text-white"
          aria-label="Select variant"
        >
          {variants.map((v) => (
            <option key={v.id} value={v.id} disabled={getAvailableStock(v.stock) <= 0}>
              {getVariantDisplayName(v)}
              {getAvailableStock(v.stock) <= 0 ? ' (out of stock)' : ` — R${((v.price_cents ?? basePriceCents) / 100).toFixed(2)}`}
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center gap-3">
        <QuantityStepper value={quantity} min={1} max={Math.max(1, stockCap)} onChange={setQuantity} />
        <Button ref={btnRef} onClick={handleAdd} disabled={isOutOfStock} fullWidth size={size} variant="primary">
          {isOutOfStock ? 'Out of stock' : 'Add to cart'}
        </Button>
      </div>
    </div>
  );
}
