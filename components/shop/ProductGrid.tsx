import { ProductCard } from './ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import type { ProductListItem } from '@/lib/catalog/queries';

type ProductGridProps = {
  products: ProductListItem[];
  loading?: boolean;
  error?: Error | null;
};

export function ProductGrid({ products, loading, error }: ProductGridProps) {
  if (loading) return <ProductGridSkeleton />;
  if (error) return <ErrorState message={error.message} />;
  if (products.length === 0) {
    return <EmptyState title="No products yet" description="This category is empty. Check back soon or browse other categories." />;
  }
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {products.map((p) => (
        <ProductCard
          key={p.id}
          slug={p.slug}
          name={p.name}
          priceCents={p.price_min_cents}
          compareAtCents={p.compare_at_cents ?? undefined}
          imageUrl={p.primary_image?.url || '/placeholder.svg'}
        />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
          <Skeleton className="mt-1 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}