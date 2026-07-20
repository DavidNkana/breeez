import Link from 'next/link';
import { InfoHeader } from '@/components/ui/InfoHeader';

export const metadata = { title: 'Terms & Conditions — Trends Day-to-Day' };

export default function TermsPage() {
  return (
    <>
      <InfoHeader title="Terms & Conditions" />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom prose prose-sm prose-headings:text-brand-950 prose-a:text-accent-700">
        <h1>Terms &amp; Conditions</h1>
        <p className="text-sm text-brand-500">Last updated: 2026-07-15</p>

        <h2>1. About Trends Day-to-Day</h2>
        <p>Trends Day-to-Day is an online retail store operated from South Africa. By using this website you agree to these terms.</p>

        <h2>2. Orders &amp; Payment</h2>
        <p>All prices are in South African Rand (ZAR) and include VAT where applicable. We accept payment via PayFast, Yoco, and Ozow. Orders are confirmed only after successful payment. We reserve the right to cancel orders due to pricing errors, stock issues, or suspected fraud.</p>

        <h2>3. Delivery</h2>
        <p>We deliver nationwide via Pargo pickup points, The Courier Guy, or Dawn Wing (metro only). Delivery times are estimates, not guarantees. Risk passes to you on delivery.</p>

        <h2>4. Returns &amp; Refunds</h2>
        <p>You have <strong>7 days</strong> from the date of delivery to return an item for a refund. The item must be unused and in its original packaging. Return shipping is at your cost. Refunds are processed within 5 business days of us receiving the returned item. See our <Link href="/legal/returns">Returns Policy</Link> for details.</p>

        <h2>5. Product Information</h2>
        <p>We try to display accurate product images, descriptions, and stock levels. Slight variations in colour may occur due to screen differences. Weights and dimensions are approximate.</p>

        <h2>6. Account</h2>
        <p>You&apos;re responsible for keeping your account credentials secure. Notify us immediately if you suspect unauthorised access.</p>

        <h2>7. Intellectual Property</h2>
        <p>All content on this site (logos, images, copy, code) belongs to Trends Day-to-Day or our licensors. Don&apos;t copy or redistribute without permission.</p>

        <h2>8. Limitation of Liability</h2>
        <p>Trends Day-to-Day&apos;s total liability for any claim is limited to the amount you paid for the relevant order. We&apos;re not liable for indirect or consequential damages.</p>

        <h2>9. Governing Law</h2>
        <p>These terms are governed by the laws of the Republic of South Africa. Any disputes are subject to the jurisdiction of South African courts.</p>

        <h2>10. Contact</h2>
        <p>Questions? Email <Link href="mailto:support@breeez.app">support@breeez.app</Link>.</p>
      </main>
    </>
  );
}