'use client';

type QuantityStepperProps = {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  size?: 'sm' | 'md' | 'lg';
};

export function QuantityStepper({ value, min = 1, max = 99, onChange, size = 'md' }: QuantityStepperProps) {
  const h = size === 'sm' ? 'h-9' : size === 'lg' ? 'h-12' : 'h-11';
  const px = size === 'sm' ? 'px-2.5' : 'px-3.5';
  const w = size === 'sm' ? 'w-11' : size === 'lg' ? 'w-16' : 'w-12';
  const textSize = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <div className={`inline-flex items-stretch ${h} rounded-md border border-brand-300 bg-white shadow-sm`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={`${px} flex items-center justify-center text-brand-700 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed border-r border-brand-200 select-none`}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className={`${w} flex items-center justify-center ${textSize} font-medium text-brand-950 select-none tabular-nums bg-white`}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={`${px} flex items-center justify-center text-brand-700 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed border-l border-brand-200 select-none`}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}