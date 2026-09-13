'use client';

import { useMounted } from '@/lib/hooks/use-mounted';

export function LowStockBadge({ stock, threshold = 5, className = '' }: { stock: number | null | undefined; threshold?: number; className?: string }) {
  const mounted = useMounted();
  if (!mounted || stock == null || stock <= 0 || stock > threshold) return null;
  return <div className={`mt-2 inline-flex items-center gap-1.5 rounded-md bg-accent-50 px-2 py-1 text-xs font-semibold text-accent-700 ring-1 ring-accent-200 ${className}`}><span className="h-2 w-2 rounded-full bg-accent-500" />Only {stock} left</div>;
}
