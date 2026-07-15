'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type QuantityStepperProps = {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
};

export function QuantityStepper({ value, min = 1, max = 99, onChange }: QuantityStepperProps) {
  return (
    <div className="flex items-center">
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        −
      </Button>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className="w-16 mx-2 text-center"
        aria-label="Quantity"
      />
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        +
      </Button>
    </div>
  );
}