'use client';

import { useState, useMemo, useEffect } from 'react';
import { VariantPicker } from './VariantPicker';
import { AddToCartButton } from './AddToCartButton';
import { PriceDisplay } from './PriceDisplay';
import { LowStockBadge } from './LowStockBadge';
import { SizeGuide } from './SizeGuide';
import type { ProductVariant } from '@/lib/supabase/types';
import { getAvailableStock, getVariantDisplayName, getPurchasableVariantForOptions, getVariantOptionGroups, getVariantOptionValue, isPurchasableVariant, reconcileSelectedOptions } from '@/lib/catalog/variant-options';

type Props = {
  productId: string;
  productSlug: string;
  productName: string;
  basePriceCents: number;
  compareAtCents: number | null;
  variants: ProductVariant[];
  images: { id: string; url: string }[];
};

export function ProductActions({ productId, productSlug, productName, basePriceCents, compareAtCents, variants, images }: Props) {
  const optionKeys = useMemo(
    () => getVariantOptionGroups(variants).map((group) => group.key),
    [variants]
  );

  // Initialize: pick the first valid option for each key
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    return reconcileSelectedOptions(variants, optionKeys, {});
  });

  useEffect(() => {
    setSelectedOptions((previous) => {
      const next = reconcileSelectedOptions(variants, optionKeys, previous);
      return JSON.stringify(next) === JSON.stringify(previous) ? previous : next;
    });
  }, [variants, optionKeys]);

  const selectedVariant = useMemo(
    () => getPurchasableVariantForOptions(variants, optionKeys, selectedOptions),
    [variants, optionKeys, selectedOptions]
  );

  function onOptionChange(key: string, value: string) {
    setSelectedOptions((prev) => ({ ...prev, [key]: value }));
  }

  const priceCents = selectedVariant?.price_cents ?? basePriceCents;
  const variantCompareAt = selectedVariant?.compare_at_cents ?? compareAtCents;
  const availableStock = variants
    .filter((variant) => isPurchasableVariant(variant) && optionKeys.every((key) => !selectedOptions[key] || getVariantOptionValue(variant, key) === selectedOptions[key]))
    .reduce((total, variant) => total + getAvailableStock(variant.stock), 0);

  return (
    <>
      <PriceDisplay priceCents={priceCents} compareAtCents={variantCompareAt} />
      <LowStockBadge stock={selectedVariant?.stock} />

      {selectedVariant && (
        <p className="mt-2 text-sm text-brand-700">
          Selected: <span className="font-medium text-brand-900">{getVariantDisplayName(selectedVariant)}</span>
        </p>
      )}

      {variants.length > 0 && optionKeys.length > 0 && (
        <div className="mt-6">
          <VariantPicker
            variants={variants}
            basePriceCents={basePriceCents}
            selectedOptions={selectedOptions}
            onOptionChange={onOptionChange}
          />
        </div>
      )}

      {/* Size guide — only for apparel/shoes categories */}
      {variants.some((v) =>
        Object.values(v.options ?? {}).some((val) =>
          ['XS', 'S', 'M', 'L', 'XL'].includes(val) ||
          ['3', '4', '5', '6', '7', '8'].includes(val)
        )
      ) && (
        <div className="mt-3">
          <SizeGuide />
        </div>
      )}

      {selectedVariant && (
        <p className="mt-3 text-sm font-medium text-brand-700 dark:text-brand-200" aria-live="polite">
          {selectedVariant.stock > 0 ? `${selectedVariant.stock} left in stock` : 'Out of stock'}
        </p>
      )}
      {!selectedVariant && optionKeys.length > 0 && (
        <p className="mt-3 text-sm font-medium text-brand-700 dark:text-brand-200" aria-live="polite">
          {availableStock > 0 ? `${availableStock} available across options` : 'Out of stock'}
        </p>
      )}

      {/* Out of stock warning for the selected variant */}
      {selectedVariant && selectedVariant.stock !== null && selectedVariant.stock !== undefined && selectedVariant.stock <= 0 && (
        <div className="mt-4 rounded-md border border-danger bg-red-50 px-3 py-2 text-sm text-red-800">
          This variant is out of stock. Pick a different option.
        </div>
      )}

      <div className="mt-6">
        <AddToCartButton
          productId={productId}
          productSlug={productSlug}
          productName={productName}
          imageUrl={images[0]?.url}
          variants={selectedVariant ? [selectedVariant] : []}
          basePriceCents={priceCents}
          size="lg"
        />
      </div>

      <div className="mt-6 text-xs text-brand-500 space-y-1">
        <p>13 Days Return Policy</p>
        <p>24/7 Dedicated support</p>
        <p>100% Secure Payment</p>
      </div>
    </>
  );
}
