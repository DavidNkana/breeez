import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { InfoHeader } from '@/components/ui/InfoHeader';
import { brand } from '@/lib/brand';

export const metadata = {
  title: `About ${brand.name} — South African multi-category ecommerce`,
  description:
    `${brand.name} is a South African curated marketplace for everyday essentials — apparel, home, kitchen, school and more — delivered nationwide.`,
};

const VALUES = [
  {
    title: 'Made for SA homes',
    body: 'No global noise. Every product is chosen for how South Africans actually live — bedrooms, kitchens, kids heading back to school.',
  },
  {
    title: 'Fair, transparent pricing',
    body: 'You see the deal before checkout. No surprise fees at the end. Free delivery over R500, in-store pickup from R0.',
  },
  {
    title: 'Local couriers, real tracking',
    body: 'Pargo lockers, The Courier Guy, Dawn Wing — all three set up so you can pick the delivery style that fits your day.',
  },
  {
    title: 'POPIA-compliant, no spam',
    body: 'Your data stays with us. We never sell it. Newsletter is opt-in. Subscriptions are opt-out anytime.',
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <InfoHeader title={`About ${brand.name}`} />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom prose prose-sm">
        <p className="text-sm font-medium text-accent-700">Proudly South African since {brand.about.founded}</p>
        <h1 className="mt-2 text-3xl font-semibold text-brand-950">Shop Smart, Save Big — Every Day.</h1>
        <p className="mt-4 text-base text-brand-700 leading-relaxed">
          {brand.about.mission}
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-brand-950">Why we started</h2>
        <p className="mt-3 text-brand-700 leading-relaxed">
          Big international stores flood South Africa with the same catalogue
          every shop shows. Local alternatives get squeezed out. We thought
          there was room for a South African-first shop that took the
          everyday categories seriously — apparel, bathroom, bedroom,
          kitchen, school — and shipped them from local warehouses at prices
          that made sense on a ZAR salary.
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-brand-950">What we believe</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {VALUES.map((v) => (
            <li key={v.title} className="rounded-lg border border-brand-200 bg-white p-5">
              <p className="text-base font-semibold text-brand-950">{v.title}</p>
              <p className="mt-2 text-sm text-brand-700 leading-relaxed">{v.body}</p>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-2xl font-semibold text-brand-950">Where we are</h2>
        <p className="mt-3 text-brand-700 leading-relaxed">
          Founded in {brand.about.founded} in {brand.contact.address.line2.split(',')[0].trim()}, {brand.name} ships nationwide via Pargo (lockers
          and pickup points), The Courier Guy (door to door), and Dawn Wing
          (same-day and overnight in major metros).
        </p>

        <h2 className="mt-10 text-2xl font-semibold text-brand-950">Talk to us</h2>
        <p className="mt-3 text-brand-700 leading-relaxed">
          Questions, a missing product, a return, a partnership pitch?{' '}
          <a href="/contact" className="text-brand-900 underline hover:text-brand-700">
            Drop us a message
          </a>{' '}
          or email{' '}
          <a href={`mailto:${brand.contact.email}`} className="text-brand-900 underline hover:text-brand-700">
            {brand.contact.email}
          </a>
          . Real humans (or very polite bots) answer within a day.
        </p>
      </main>
      <Footer />
    </>
  );
}
