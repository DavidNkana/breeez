'use client';

import { useEffect, useState } from 'react';
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
  warnings?: string[];
  brand?: string;
  sku?: string;
  category?: string;
  categoryName?: string;
};

type Props = {
  onParsed: (data: ScrapedProduct) => void;
};

export function ProductUrlImporter({ onParsed }: Props) {
  const [mounted, setMounted] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [summary, setSummary] = useState<{ images: number; variants: number; category?: string; warnings: string[] } | null>(null);
  const showToast = useToast((s) => s.show);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function parseUrl() {
    setError('');
    setSuccess(false);
    setSummary(null);
    setLoading(true);
    try {
      const response = await fetch('/api/admin/scrape-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Could not parse this product URL');
      const data = result.data as ScrapedProduct;
      onParsed(data);
      setSummary({ images: data.images.length, variants: data.variants.length, category: data.categoryName ?? data.category, warnings: data.warnings ?? [] });
      setSuccess(true);
      showToast('Product details imported successfully', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not parse this product URL');
    } finally {
      setLoading(false);
    }
  }

  // The importer reads from the client-side toast store and contains generated
  // input ids. Keep its first render identical on the server and client, then
  // mount the interactive controls after hydration.
  if (!mounted) {
    return (
      <div
        className="rounded-lg border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-700 dark:bg-brand-900/50"
        aria-hidden="true"
      >
        <div className="mb-3 h-4 w-32 rounded bg-brand-200/70 dark:bg-brand-700/70" />
        <div className="h-8 w-full rounded bg-brand-200/50 dark:bg-brand-700/50" />
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${success ? 'border-success/50 bg-success/5 dark:bg-success/10' : 'border-brand-200 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-900/50'}`}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-brand-900 dark:text-brand-50">Import from URL</h2>
        <p className="mt-0.5 text-xs text-brand-600 dark:text-brand-300">Paste a product link from Fashion World, Lily, or another SA store.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          label="Import from URL (Fashion World, Lily, etc.)"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void parseUrl();
            }
          }}
          placeholder="https://www.fashionworld.co.za/product/..."
          error={error}
          disabled={loading}
        />
        <Button type="button" onClick={parseUrl} loading={loading} disabled={!url.trim()} className="sm:mb-0.5">Parse</Button>
      </div>
      {success && summary && (
        <div className="mt-2 text-xs">
          <p className="font-medium text-success">Imported {summary.images} image{summary.images === 1 ? '' : 's'} and {summary.variants} variant{summary.variants === 1 ? '' : 's'}{summary.category ? ` in ${summary.category}` : ''} — stock is floored at 10 for imported variants; review before saving.</p>
          {summary.warnings.length > 0 && <p className="mt-1 text-warning">{summary.warnings.length} image{summary.warnings.length === 1 ? '' : 's'} skipped: {summary.warnings.join(', ')}.</p>}
        </div>
      )}
    </div>
  );
}
