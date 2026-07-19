'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { formatRand } from '@/lib/format';

export type AppliedCoupon = {
  code: string;
  kind: 'percent' | 'fixed_amount';
  value: number;
  discountCents: number;
  description?: string;
};

type Props = {
  subtotalCents: number;
  applied: AppliedCoupon | null;
  onApplied: (coupon: AppliedCoupon | null) => void;
};

/**
 * Coupon code input. Renders inline in the order summary panel on the
 * checkout page right column. Works on the rendered server output because
 * the validation API is called client-side.
 */
export function CouponCodeInput({ subtotalCents, applied, onApplied }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const showToast = useToast((s) => s.show);

  async function apply() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      showToast('Enter a coupon code', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/coupon/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: trimmed, subtotalCents }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        showToast(data.reason ?? 'Invalid coupon', 'error');
        return;
      }
      onApplied({
        code: data.code,
        kind: data.kind,
        value: data.value,
        discountCents: data.discountCents,
        description: data.description,
      });
      showToast(
        `${data.code} applied — you saved ${formatRand(data.discountCents)}`,
        'success'
      );
      setCode('');
    } catch (e: any) {
      showToast(e?.message ?? 'Network error', 'error');
    } finally {
      setLoading(false);
    }
  }

  function remove() {
    onApplied(null);
    showToast('Coupon removed', 'info');
  }

  if (applied) {
    return (
      <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-emerald-900">
              {applied.code} applied
            </p>
            {applied.description && (
              <p className="text-xs text-emerald-700 mt-0.5 truncate">{applied.description}</p>
            )}
            <p className="text-xs text-emerald-700 mt-1">
              {applied.kind === 'percent'
                ? `${applied.value}% off`
                : `${formatRand(applied.value)} off`}
              {' — saved '}
              <span className="font-semibold">{formatRand(applied.discountCents)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={remove}
            className="text-xs text-emerald-700 underline hover:text-emerald-900"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-brand-500">
        Coupon code
      </p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="FREESHIP, WELCOME10..."
          className="flex-1"
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              apply();
            }
          }}
        />
        <Button onClick={apply} loading={loading} variant="secondary" size="md">
          Apply
        </Button>
      </div>
    </div>
  );
}
