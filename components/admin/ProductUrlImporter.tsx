'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export type ScrapedProduct = {
  name: string;
  description: string;
  price: number;
  comparePrice: number | null;
  images: string[];
  variants: Array<{
    name: string;
    sku: string;
    options: Record<string, string>;
    price: number;
    stock: number;
  }>;
  brand?: string;
  sku?: string;
};

type Props = {
  onParsed: (data: ScrapedProduct) => void;
};

export function ProductUrlImporter({ onParsed }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const showToast = useToast((s) => s.show);

  async function parseUrl(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      const response = await fetch('/api/admin/scrape-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Could not parse this product URL');
      onParsed(result.data as ScrapedProduct);
      setSuccess(true);
      showToast('Product details imported successfully', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not parse this product URL');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`rounded-lg border p-4 ${success ? 'border-success/50 bg-success/5 dark:bg-success/10' : 'border-brand-200 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-900/50'}`}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-brand-900 dark:text-brand-50">Import from URL</h2>
        <p className="mt-0.5 text-xs text-brand-600 dark:text-brand-300">Paste a product link from Fashion World, Lily, or another SA store.</p>
      </div>
      <form onSubmit={parseUrl} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          label="Import from URL (Fashion World, Lily, etc.)"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.fashionworld.co.za/product/..."
          error={error}
          disabled={loading}
        />
        <Button type="submit" loading={loading} disabled={!url.trim()} className="sm:mb-0.5">Parse</Button>
      </form>
      {success && <p className="mt-2 text-xs font-medium text-success">Product details filled in — review them before saving.</p>}
    </div>
  );
}
