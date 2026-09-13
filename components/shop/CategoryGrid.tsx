import Link from 'next/link';
import { listCategories } from '@/lib/catalog/queries';

type CategoryGridProps = {
  homeOnly?: boolean;
};

const DEFAULT_IMAGES: Record<string, string> = {
  women: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=600&fit=crop&q=80',
  men: 'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=600&h=600&fit=crop&q=80',
  kids: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=600&h=600&fit=crop&q=80',
  shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&q=80',
  bags: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop&q=80',
  'home-decor': 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&h=600&fit=crop&q=80',
  kitchen: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=600&fit=crop&q=80',
  'bed-bath': 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&h=600&fit=crop&q=80',
  curtains: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&h=600&fit=crop&q=80',
  'everyday-essentials': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop&q=80',
  'back-to-school': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=600&fit=crop&q=80',
  'plus-size': 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600&h=600&fit=crop&q=80',
  babywear: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&h=600&fit=crop&q=80',
};

export async function CategoryGrid({ homeOnly = false }: CategoryGridProps) {
  const cats = await listCategories({ homeOnly });
  if (cats.length === 0) return <p className="text-sm text-brand-400">No categories yet.</p>;

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {cats.map((c) => (
        <Link key={c.slug} href={`/c/${c.slug}`} className="group relative aspect-square overflow-hidden rounded-lg bg-brand-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {c.imageUrl || DEFAULT_IMAGES[c.slug] ? (
            <img src={c.imageUrl ?? DEFAULT_IMAGES[c.slug]} alt={c.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-2xl font-semibold text-brand-300">{c.name[0]}</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <span className="absolute bottom-2 left-2 right-2 text-sm font-medium text-white drop-shadow-sm">{c.name}</span>
        </Link>
      ))}
    </div>
  );
}
