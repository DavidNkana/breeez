import Link from 'next/link';
import { formatRand } from '@/lib/format';

type ProductCardProps = {
  slug: string;
  name: string;
  priceCents: number;
  compareAtCents?: number;
  imageUrl: string;
};

export function ProductCard({ slug, name, priceCents, compareAtCents, imageUrl }: ProductCardProps) {
  const onSale = compareAtCents != null && compareAtCents > priceCents;
  return (
    <Link href={`/p/${slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-md bg-brand-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {onSale && (
          <span className="absolute left-2 top-2 rounded bg-accent-500 px-2 py-0.5 text-xs font-semibold text-white">
            SALE
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-sm font-medium text-brand-950 line-clamp-1">{name}</p>
      </div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-sm font-semibold text-brand-950">{formatRand(priceCents)}</span>
        {onSale && (
          <span className="text-xs text-brand-500 line-through">{formatRand(compareAtCents!)}</span>
        )}
      </div>
    </Link>
  );
}