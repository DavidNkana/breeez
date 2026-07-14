import Link from 'next/link';

type Category = {
  slug: string;
  name: string;
  imageUrl: string;
};

const CATEGORIES: Category[] = [
  { slug: 'back-to-school',  name: 'Back to School', imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=600&fit=crop&q=80' },
  { slug: 'apparel',         name: 'Apparel',        imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=600&fit=crop&q=80' },
  { slug: 'bags',            name: 'Bags',           imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop&q=80' },
  { slug: 'bathroom',        name: 'Bathroom',       imageUrl: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&h=600&fit=crop&q=80' },
  { slug: 'bedroom',         name: 'Bedroom',        imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&h=600&fit=crop&q=80' },
  { slug: 'curtains',        name: 'Curtains',       imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&h=600&fit=crop&q=80' },
  { slug: 'everyday-essentials', name: 'Everyday Essentials', imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop&q=80' },
  { slug: 'home-decor',      name: 'Home Decor',     imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&h=600&fit=crop&q=80' },
  { slug: 'kitchen',         name: 'Kitchen',        imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=600&fit=crop&q=80' },
  { slug: 'shoes',           name: 'Shoes',          imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&q=80' }
];

export function CategoryGrid() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {CATEGORIES.map((c) => (
        <Link
          key={c.slug}
          href={`/c/${c.slug}`}
          className="group relative aspect-square overflow-hidden rounded-lg bg-brand-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={c.imageUrl}
            alt={c.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <span className="absolute bottom-2 left-2 right-2 text-sm font-medium text-white drop-shadow-sm">
            {c.name}
          </span>
        </Link>
      ))}
    </div>
  );
}