'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import type { ProductVariant } from '@/lib/supabase/types';

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
    return Array.from(new Set(variants.flatMap((v) => Object.keys(v.options))));
  }, [variants]);

  // Find the variant matching ALL selected options
  const selectedVariant = useMemo(() => {
    return variants.find((v) =>
      optionKeys.every((key) => v.options[key] === selectedOptions[key])
    ) ?? null;
  }, [variants, optionKeys, selectedOptions]);

  // For each option key, find which values have at least one valid variant
  // given the OTHER selected options
  function getValidValues(key: string): Set<string> {
    const others = optionKeys.filter((k) => k !== key);
    const valid = new Set<string>();
    for (const v of variants) {
      if (v.stock === 0 && !v.is_active) continue;
      const matchesOthers = others.every((k) => v.options[k] === selectedOptions[k]);
      if (matchesOthers) {
        valid.add(v.options[key]);
      }
    }
    return valid;
  }

  const priceCents = selectedVariant?.price_cents ?? basePriceCents;
  const stock = selectedVariant?.stock ?? 0;

  return (
    <div className="space-y-5">
      {optionKeys.map((key) => {
        const validValues = getValidValues(key);
        return (
          <div key={key}>
            <p className="text-sm font-medium text-brand-900 capitalize mb-2">{key}</p>
            <div className="flex flex-wrap gap-2">
              {variants
                .filter((v) => v.options[key])
                .map((v) => {
                  const value = v.options[key];
                  if (!value) return null;
                  const isSelected = selectedOptions[key] === value;
                  const isValid = validValues.has(value);
                  return (
                    <button
                      key={`${key}-${value}`}
                      type="button"
                      onClick={() => isValid && onOptionChange(key, value)}
                      disabled={!isValid}
                      className={clsx(
                        'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                        !isValid && 'border-brand-200 bg-brand-50 text-brand-400 line-through cursor-not-allowed',
                        isValid && isSelected && 'border-brand-900 bg-brand-900 text-white',
                        isValid && !isSelected && 'border-brand-300 bg-white text-brand-900 hover:border-brand-500'
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
            <span>In stock — {stock} available</span>
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