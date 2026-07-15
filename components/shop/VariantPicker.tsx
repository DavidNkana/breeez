'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { ProductVariant } from '@/lib/supabase/types';

type VariantPickerProps = {
  variants: ProductVariant[];
  basePriceCents: number;
};

export function VariantPicker({ variants, basePriceCents }: VariantPickerProps) {
  const [selected, setSelected] = useState<string>(variants[0]?.id ?? '');

  const selectedVariant = variants.find((v) => v.id === selected) ?? variants[0];
  const optionKeys = Array.from(new Set(variants.flatMap((v) => Object.keys(v.options))));
  const inStock = (id: string) => (variants.find((v) => v.id === id)?.stock ?? 0) > 0;

  return (
    <div className="space-y-4">
      {optionKeys.map((key) => (
        <div key={key}>
          <p className="text-sm font-medium text-brand-900 capitalize">{key}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {variants.map((v) => {
              const value = v.options[key];
              if (!value) return null;
              const isSelected = selected === v.id;
              const isOut = v.stock === 0;
              return (
                <button
                  key={`${v.id}-${key}`}
                  type="button"
                  onClick={() => !isOut && setSelected(v.id)}
                  disabled={isOut}
                  className={clsx(
                    'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                    isOut && 'border-brand-200 bg-brand-50 text-brand-400 line-through cursor-not-allowed',
                    !isOut && isSelected && 'border-brand-900 bg-brand-900 text-white',
                    !isOut && !isSelected && 'border-brand-300 bg-white text-brand-900 hover:border-brand-500'
                  )}
                  title={isOut ? 'Out of stock' : `In stock (${v.stock})`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2 text-xs text-brand-600">
        {selectedVariant && selectedVariant.stock > 0 ? (
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-success" />
            <span>In stock — {selectedVariant.stock} available</span>
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