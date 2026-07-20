import { InfoHeader } from '@/components/ui/InfoHeader';

export const metadata = { title: 'Returns Policy — Trends Day-to-Day' };

export default function ReturnsPage() {
  return (
    <>
      <InfoHeader title="Returns Policy" />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom prose prose-sm prose-headings:text-brand-950 prose-a:text-accent-700">
        <h1>Returns Policy</h1>
        <p className="text-sm text-brand-500">Last updated: 2026-07-15</p>

        <h2>7-Day Window</h2>
        <p>You have <strong>7 days</strong> from the date of delivery to return an item for a refund. After 7 days, we can&apos;t offer a refund or exchange.</p>

        <h2>Eligibility</h2>
        <p>To be eligible for a return:</p>
        <ul>
          <li>The item must be unused and in the same condition you received it</li>
          <li>It must be in the original packaging with all tags attached</li>
          <li>You must have the receipt or order confirmation</li>
        </ul>
        <p>Non-returnable items: underwear, earrings, personalised items, and perishable goods.</p>

        <h2>How to Return</h2>
        <ol>
          <li>Email <a href="mailto:returns@breeez.app">returns@breeez.app</a> with your order number and reason</li>
          <li>We&apos;ll send you a return authorisation and the return address</li>
          <li>Pack the item securely and ship it to us (return shipping is at your cost)</li>
          <li>Once we receive and inspect the item, we&apos;ll notify you of the refund decision</li>
        </ol>

        <h2>Refunds</h2>
        <p>Refunds are processed within <strong>5 business days</strong> of us receiving the returned item, via the original payment method.</p>

        <h2>Damaged or Wrong Items</h2>
        <p>If your item arrives damaged or you received the wrong product, we&apos;ll cover the return shipping. Email <a href="mailto:returns@breeez.app">returns@breeez.app</a> with photos within 48 hours of delivery.</p>

        <h2>Exchanges</h2>
        <p>Need a different size or colour? Email us and we&apos;ll arrange an exchange (subject to stock availability).</p>

        <h2>Contact</h2>
        <p><a href="mailto:returns@breeez.app">returns@breeez.app</a></p>
      </main>
    </>
  );
}