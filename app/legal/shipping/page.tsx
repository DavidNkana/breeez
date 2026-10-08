import { brand } from '@/lib/brand';

export const metadata = { title: 'Shipping Policy — Evasale' };

export default function ShippingPage() {
  return (
    <>
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom prose prose-sm prose-headings:text-brand-950 prose-a:text-accent-700">
        <h1>Shipping Policy</h1>
        <p className="text-sm text-brand-500">Last updated: 2026-07-15</p>

        <h2>Delivery options</h2>
        <p>We currently offer one delivery option at checkout: The Courier Guy door delivery. The displayed flat price is the current checkout price; it is not a live courier quote.</p>

      <h3>The Courier Guy door delivery — R89</h3>
      <p>Standard delivery to your address nationwide. ETA 2-5 working days is an estimate. We do not currently provide live Courier Guy booking or tracking from checkout.</p>

      <h2>Delivery times</h2>
      <p>All ETAs are estimates. Public holidays, severe weather, and courier operational issues may cause delays. We&apos;ll keep you informed if your delivery is delayed.</p>

      <h2>Tracking</h2>
        <p>We will share dispatch information when available. Live courier tracking is not currently integrated.</p>

      <h2>Issues with delivery</h2>
      <p>If your order hasn&apos;t arrived within 7 days of the ETA, please email <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a> with your order number.</p>
      </main>
    </>
  );
}
