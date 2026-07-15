'use client';

import { Button } from '@/components/ui/Button';

type QuantityStepperProps = {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  size?: 'sm' | 'md' | 'lg';
};

/**
 * Quantity stepper (− [3] +) with perfectly aligned buttons + number input.
 *
 * Uses inline-flex + h-10 (or h-9/h-12 for sm/lg) to make the buttons match
 * the input height exactly. The input uses h-full to fill the row, and we
 * remove default appearance so the three controls share a single rounded
 * border (rounded-md) split visually into three sections.
 */
export function QuantityStepper({ value, min = 1, max = 99, onChange, size = 'md' }: QuantityStepperProps) {
  const heights = { sm: 'h-9', md: 'h-10', lg: 'h-12' };
  const buttonSize = { sm: 'sm', md: 'md', lg: 'lg' } as const;
  const inputWidth = { sm: 'w-12', md: 'w-14', lg: 'w-16' };
  const textSize = { sm: 'text-sm', md: 'text-sm', lg: 'text-base' };
  const h = heights[size];

  return (
    <div className={`inline-flex items-stretch ${h} rounded-md border border-brand-300 overflow-hidden bg-white`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="px-3 text-brand-700 hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border-r border-brand-200"
      >
        −
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className={`${inputWidth[size]} h-full text-center ${textSize[size]} text-brand-950 bg-white border-0 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
        aria-label="Quantity"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="px-3 text-brand-700 hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border-l border-brand-200"
      >
        +
      </button>
    </div>
  );
}