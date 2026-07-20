import { InfoHeader } from '@/components/ui/InfoHeader';

export const metadata = { title: 'Shipping Policy — Trends Day-to-Day' };

export default function ShippingPage() {
  return (
    <>
      <InfoHeader title="Shipping Policy" />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom prose prose-sm prose-headings:text-brand-950 prose-a:text-accent-700">
        <h1>Shipping Policy</h1>
        <p className="text-sm text-brand-500">Last updated: 2026-07-15</p>

        <h2>Delivery options</h2>
        <p>We offer three delivery options at checkout. Availability depends on your postal code and order size.</p>

      <h3>1. Pargo Pickup Point — R49</h3>
      <p>Collect your order at one of 2,500+ Pargo pickup points across South Africa. Best for affordable nationwide delivery. ETA 3-5 working days. We&apos;ll send you a pickup code via SMS when your order is ready.</p>

      <h3>2. Door Delivery (The Courier Guy) — R89</h3>
      <p>Standard delivery to your door, anywhere in South Africa. ETA 2-5 working days. Tracking link sent via email once dispatched.</p>

      <h3>3. Same-day Metro (Dawn Wing) — R149</h3>
      <p>Order before 11am and get it the same day. Only available in major metros (Johannesburg, Cape Town, Durban, Pretoria). ETA: same day.</p>

      <h2>Free delivery</h2>
      <p>Orders over <strong>R500</strong> qualify for free standard delivery (Pargo or Door Delivery).</p>

      <h2>Delivery times</h2>
      <p>All ETAs are estimates. Public holidays, severe weather, and courier operational issues may cause delays. We&apos;ll keep you informed if your delivery is delayed.</p>

      <h2>Tracking</h2>
      <p>Once your order ships, you&apos;ll receive an email with a tracking link. You can also view tracking on your <a href="/account/orders">account orders page</a>.</p>

      <h2>Issues with delivery</h2>
      <p>If your order hasn&apos;t arrived within 7 days of the ETA, please email <a href="mailto:support@breeez.app">support@breeez.app</a> with your order number.</p>
      </main>
    </>
  );
}