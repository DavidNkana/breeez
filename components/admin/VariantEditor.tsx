'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { createBrowserClient } from '@supabase/ssr';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type VariantRow = {
  id?: string; // undefined for new, string for existing
  product_id: string;
  sku: string;
  name: string;
  options: Record<string, string>; // e.g. { Size: 'M', Colour: 'Red' }
  price_cents: number | null;
  compare_at_cents: number | null;
  stock: number;
  is_active: boolean;
  sort_order: number;
};

type Props = {
  productId: string;
  variants: VariantRow[];
  onChange: (variants: VariantRow[]) => void;
};

/**
 * Inline table editor for product variants.
 * Each row lets you edit SKU, name, option values, price override, stock.
 * Rows can be added, deleted, and toggled active/inactive.
 */
export function VariantEditor({ productId, variants, onChange }: Props) {
  const showToast = useToast((s) => s.show);
  const [optionKeys, setOptionKeys] = useState<string[]>(() => {
    const keys = new Set<string>();
    variants.forEach((v) => Object.keys(v.options).forEach((k) => keys.add(k)));
    return keys.size > 0 ? Array.from(keys) : ['Size'];
  });

  function addOptionKey() {
    setOptionKeys([...optionKeys, '']);
  }

  function updateOptionKey(idx: number, value: string) {
    const next = [...optionKeys];
    next[idx] = value;
    setOptionKeys(next.filter(Boolean));
  }

  function removeOptionKey(idx: number) {
    if (optionKeys.length <= 1) {
      showToast('Need at least one option type', 'warning');
      return;
    }
    const next = optionKeys.filter((_, i) => i !== idx);
    setOptionKeys(next);
    // Also remove the deleted key from all variants
    const deletedKey = optionKeys[idx];
    onChange(variants.map((v) => {
      const opts = { ...v.options };
      delete opts[deletedKey];
      return { ...v, options: opts };
    }));
  }

  function updateVariant(idx: number, field: keyof VariantRow, value: any) {
    const next = [...variants];
    next[idx] = { ...next[idx], [field]: value };
    onChange(next);
  }

  function updateVariantOption(idx: number, key: string, value: string) {
    const next = [...variants];
    next[idx] = { ...next[idx], options: { ...next[idx].options, [key]: value } };
    onChange(next);
  }

  function addVariant() {
    const newVariant: VariantRow = {
      product_id: productId,
      sku: `VAR-${Date.now().toString(36).toUpperCase()}`,
      name: `Variant ${variants.length + 1}`,
      options: Object.fromEntries(optionKeys.filter(Boolean).map((k) => [k, ''])),
      price_cents: null,
      compare_at_cents: null,
      stock: 0,
      is_active: true,
      sort_order: variants.length
    };
    onChange([...variants, newVariant]);
  }

  function removeVariant(idx: number) {
    onChange(variants.filter((_, i) => i !== idx));
  }

  if (variants.length === 0) {
    return (
      <div>
        <label className="mb-2 block text-sm font-medium text-brand-900">Variants</label>
        <div className="rounded-lg border border-dashed border-brand-300 p-6 text-center">
          <p className="text-sm text-brand-600 mb-3">No variants yet. Add sizes, colours, and stock levels.</p>
          <Button onClick={addVariant} size="sm">+ Add first variant</Button>
        </div>
      </div>
    );
  }

  const hasAnyOverrides = variants.some((v) => v.price_cents != null);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-brand-900">Variants ({variants.length})</label>
        <div className="flex gap-2">
          <Button onClick={() => setOptionKeys([...optionKeys, ''])} size="sm" variant="secondary">+ Option type</Button>
          <Button onClick={addVariant} size="sm">+ Add variant</Button>
        </div>
      </div>

      {/* Option key labels */}
      <div className="mb-2 flex flex-wrap gap-2">
        {optionKeys.map((key, idx) => (
          <div key={idx} className="flex items-center gap-1 rounded border border-brand-200 bg-white px-2 py-0.5 text-xs">
            <input
              type="text"
              value={key}
              onChange={(e) => updateOptionKey(idx, e.target.value)}
              placeholder="Size"
              className="w-16 border-0 bg-transparent text-xs font-medium text-brand-900 outline-none"
            />
            <button type="button" onClick={() => removeOptionKey(idx)} className="text-brand-400 hover:text-danger">×</button>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-brand-200">
        <table className="w-full text-sm">
          <thead className="bg-brand-50 text-left text-xs uppercase text-brand-600">
            <tr>
              <th className="px-2 py-2 w-24">SKU</th>
              <th className="px-2 py-2 w-32">Name</th>
              {optionKeys.filter(Boolean).map((key) => (
                <th key={key} className="px-2 py-2 w-24">{key}</th>
              ))}
              {hasAnyOverrides && <th className="px-2 py-2 w-24">Price</th>}
              {hasAnyOverrides && <th className="px-2 py-2 w-24">Comp. at</th>}
              <th className="px-2 py-2 w-20">Stock</th>
              <th className="px-2 py-2 w-16">Active</th>
              <th className="px-2 py-2 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {variants.map((v, idx) => (
              <tr key={v.id || idx} className={v.is_active ? '' : 'opacity-50'}>
                <td className="px-2 py-1">
                  <input
                    type="text"
                    value={v.sku}
                    onChange={(e) => updateVariant(idx, 'sku', e.target.value)}
                    className="w-full rounded border border-brand-200 bg-transparent px-1 py-1 text-xs text-brand-900"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="text"
                    value={v.name}
                    onChange={(e) => updateVariant(idx, 'name', e.target.value)}
                    className="w-full rounded border border-brand-200 bg-transparent px-1 py-1 text-xs text-brand-900"
                  />
                </td>
                {optionKeys.filter(Boolean).map((key) => (
                  <td key={key} className="px-2 py-1">
                    <input
                      type="text"
                      value={v.options[key] || ''}
                      onChange={(e) => updateVariantOption(idx, key, e.target.value)}
                      className="w-full rounded border border-brand-200 bg-transparent px-1 py-1 text-xs text-brand-900"
                    />
                  </td>
                ))}
                {hasAnyOverrides && (
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      step="0.01"
                      value={v.price_cents != null ? (v.price_cents / 100).toFixed(2) : ''}
                      onChange={(e) => updateVariant(idx, 'price_cents', e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null)}
                      placeholder="—"
                      className="w-full rounded border border-brand-200 bg-transparent px-1 py-1 text-xs text-brand-900"
                    />
                  </td>
                )}
                {hasAnyOverrides && (
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      step="0.01"
                      value={v.compare_at_cents != null ? (v.compare_at_cents / 100).toFixed(2) : ''}
                      onChange={(e) => updateVariant(idx, 'compare_at_cents', e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null)}
                      placeholder="—"
                      className="w-full rounded border border-brand-200 bg-transparent px-1 py-1 text-xs text-brand-900"
                    />
                  </td>
                )}
                <td className="px-2 py-1">
                  <input
                    type="number"
                    min="0"
                    value={v.stock}
                    onChange={(e) => updateVariant(idx, 'stock', Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full rounded border border-brand-200 bg-transparent px-1 py-1 text-xs text-brand-900"
                  />
                </td>
                <td className="px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={v.is_active}
                    onChange={(e) => updateVariant(idx, 'is_active', e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-brand-300 text-accent-500"
                  />
                </td>
                <td className="px-2 py-1">
                  <button
                    type="button"
                    onClick={() => removeVariant(idx)}
                    className="text-brand-400 hover:text-danger text-lg leading-none"
                    aria-label="Remove variant"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-1 text-xs text-brand-500">
        Use the price override column if this variant costs more than the base product price. Leave blank to inherit.
      </p>
    </div>
  );
}