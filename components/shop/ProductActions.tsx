'use client';

import { useState, useMemo } from 'react';
import { VariantPicker } from './VariantPicker';
import { AddToCartButton } from './AddToCartButton';
import { PriceDisplay } from './PriceDisplay';
import { LowStockBadge } from './TrackRecentlyViewed';
import { SizeGuide } from './SizeGuide';
import type { ProductVariant } from '@/lib/supabase/types';

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
    () => Array.from(new Set(variants.flatMap((v) => Object.keys(v.options)))),
    [variants]
  );

  // Initialize: pick the first valid option for each key
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const key of optionKeys) {
      const firstVariant = variants.find((v) => v.options[key]);
      if (firstVariant) init[key] = firstVariant.options[key];
    }
    return init;
  });

  const selectedVariant = useMemo(() =>
    variants.find((v) =>
      optionKeys.every((k) => v.options[k] === selectedOptions[k])
    ) ?? null,
    [variants, optionKeys, selectedOptions]
  );

  function onOptionChange(key: string, value: string) {
    setSelectedOptions((prev) => ({ ...prev, [key]: value }));
  }

  const priceCents = selectedVariant?.price_cents ?? basePriceCents;
  const variantCompareAt = selectedVariant?.compare_at_cents ?? compareAtCents;

  return (
    <>
      <PriceDisplay priceCents={priceCents} compareAtCents={variantCompareAt} />
      <LowStockBadge stock={selectedVariant?.stock} />

      {/* Show currently selected variant name + sku */}
      {selectedVariant && selectedVariant.name && selectedVariant.name !== 'Default' && (
        <p className="mt-2 text-sm text-brand-700">
          Selected: <span className="font-medium text-brand-900">{selectedVariant.name}</span>
          {selectedVariant.sku && (
            <span className="ml-2 text-xs text-brand-400">SKU: {selectedVariant.sku}</span>
          )}
        </p>
      )}

      {variants.length > 0 && optionKeys.length > 1 && (
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

      {variants.length === 1 && variants[0].name !== 'Default' && (
        <p className="mt-4 text-sm text-brand-600">{variants[0].name}</p>
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
        />
      </div>

      <div className="mt-6 text-xs text-brand-500 space-y-1">
        <p>Free delivery over R500</p>
        <p>7-day returns, customer pays return shipping</p>
        <p>Secure payments via PayFast / Yoco / Ozow</p>
      </div>
    </>
  );
}