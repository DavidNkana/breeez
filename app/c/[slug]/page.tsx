import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/shop/ProductCard';

type Props = { params: { slug: string } };

export default function CategoryPage({ params }: Props) {
  const name = params.slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-20 safe-bottom">
        <nav className="text-xs text-brand-500">
          <a href="/" className="hover:underline">Home</a>
          <span className="mx-1">/</span>
          <span className="text-brand-700">{name}</span>
        </nav>
        <h1 className="mt-2 text-2xl md:text-3xl font-semibold text-brand-950">{name}</h1>
        <p className="mt-1 text-sm text-brand-600">PLP placeholder — filters + grid wired up in implementation plan Task 9.</p>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCard
              key={i}
              slug={`placeholder-${params.slug}-${i}`}
              name={`${name} item ${i + 1}`}
              priceCents={9900 + i * 1100}
              imageUrl={`https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop&q=${i * 10 + 50}`}
            />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}