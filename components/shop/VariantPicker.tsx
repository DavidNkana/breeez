'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import type { ProductVariant } from '@/lib/supabase/types';
import { getAvailableStock, getVariantForOptions, getVariantOptionGroups, getVariantOptionRenderModel, getVariantOptionValue, isPurchasableVariant } from '@/lib/catalog/variant-options';

type Props = {
  variants: ProductVariant[];
  basePriceCents: number;
  selectedOptions: Record<string, string>;
  onOptionChange: (key: string, value: string) => void;
};

/**
 * Variant option selector.
 *
 * Uses independent option tracking (e.g. selectedOptions = { Size: 'M', Colour: 'Silver' })
 * so picking a colour doesn't auto-select a size. Disables option buttons that would lead
 * to a non-existent variant combination.
 */
export function VariantPicker({ variants, basePriceCents, selectedOptions, onOptionChange }: Props) {
  const optionKeys = useMemo(() => {
    return getVariantOptionGroups(variants).map((group) => group.key);
  }, [variants]);

  // Find the variant matching ALL selected options
  const selectedVariant = useMemo(() => {
    return getVariantForOptions(variants, optionKeys, selectedOptions);
  }, [variants, optionKeys, selectedOptions]);

  // For each option key, find which values have at least one valid variant
  // given the OTHER selected options
  const priceCents = selectedVariant?.price_cents ?? basePriceCents;
  const stock = selectedVariant ? (isPurchasableVariant(selectedVariant) ? getAvailableStock(selectedVariant.stock) : 0) : variants
    .filter((variant) => optionKeys.every((key) => !selectedOptions[key] || getVariantOptionValue(variant, key) === selectedOptions[key]))
    .filter(isPurchasableVariant)
    .reduce((total, variant) => total + getAvailableStock(variant.stock), 0);

  return (
    <div className="space-y-5">
      {getVariantOptionRenderModel(variants, selectedOptions).map(({ key, options }) => {
        return (
          <div key={key}>
            <p className="text-sm font-medium text-brand-900 capitalize mb-2">{key}</p>
            <div className="flex flex-wrap gap-2">
              {options.map(({ value, isSelected, disabled, crossedOut }) => {
                  return (
                    <button
                      key={`${key}-${value}`}
                      type="button"
                      onClick={() => !disabled && onOptionChange(key, value)}
                      disabled={disabled}
                      className={clsx(
                        'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                        crossedOut && 'border-brand-200 bg-brand-50 text-brand-400 line-through cursor-not-allowed',
                        !disabled && isSelected && 'border-accent-500 bg-accent-500 text-white',
                        !disabled && !isSelected && 'border-brand-300 bg-white text-brand-900 dark:border-brand-600 dark:bg-brand-900 dark:text-brand-100 hover:border-brand-500'
                      )}
                    >
                      {value}
                    </button>
                  );
                })}
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-2 text-xs text-brand-600 pt-1">
        {stock > 0 ? (
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-success" />
            <span>{selectedVariant ? `${stock} left in stock` : `${stock} available across options`}</span>
          </>
        ) : (
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-danger" />
            <span>Out of stock</span>
          </>
        )}
      </div>
    </div>
  );
}
