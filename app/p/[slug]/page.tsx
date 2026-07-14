import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { formatRand } from '@/lib/format';

type Props = { params: { slug: string } };

export default function ProductPage({ params }: Props) {
  const name = params.slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  const priceCents = 24900;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-20 safe-bottom">
        <nav className="text-xs text-brand-500">
          <a href="/" className="hover:underline">Home</a>
          <span className="mx-1">/</span>
          <a href="/c/apparel" className="hover:underline">Apparel</a>
          <span className="mx-1">/</span>
          <span className="text-brand-700">{name}</span>
        </nav>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div className="aspect-square overflow-hidden rounded-lg bg-brand-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop&q=80"
              alt={name}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-brand-950">{name}</h1>
            <p className="mt-2 text-2xl font-semibold text-brand-900">{formatRand(priceCents)}</p>
            <p className="mt-4 text-sm text-brand-600">
              PDP placeholder. Variant picker, add-to-cart, and gallery wired up in plan Task 10.
            </p>
            <button
              type="button"
              className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-brand-900 px-6 py-3 text-sm font-medium text-white hover:bg-brand-800 md:w-auto"
            >
              Add to cart
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}