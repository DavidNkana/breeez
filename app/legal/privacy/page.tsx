import { InfoHeader } from '@/components/ui/InfoHeader';

export const metadata = { title: 'Privacy Notice (POPIA) — Breeez' };

export default function PrivacyPage() {
  return (
    <>
      <InfoHeader title="Privacy Notice (POPIA)" />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom prose prose-sm prose-headings:text-brand-950 prose-a:text-accent-700">
        <h1>Privacy Notice (POPIA)</h1>
        <p className="text-sm text-brand-500">Last updated: 2026-07-15</p>
        <p>This notice explains how Breeez collects, uses, and protects your personal information in compliance with the <strong>Protection of Personal Information Act 4 of 2013 (POPIA)</strong>.</p>

        <h2>1. Information We Collect</h2>
        <ul>
          <li><strong>Account:</strong> email, name, password (hashed)</li>
          <li><strong>Orders:</strong> shipping address, phone, order history</li>
          <li><strong>Payments:</strong> handled by PayFast / Yoco / Ozow (we never see your card)</li>
          <li><strong>Usage:</strong> pages viewed, device type (via PostHog analytics)</li>
        </ul>

        <h2>2. Why We Collect It</h2>
        <ul>
          <li>To process and deliver your orders</li>
          <li>To send order confirmations, shipping updates, and support responses</li>
          <li>To improve the website and prevent fraud</li>
        </ul>

        <h2>3. How Long We Keep It</h2>
        <p>We keep your data for as long as your account is active, plus 3 years for tax/audit purposes. You can request deletion at any time.</p>

        <h2>4. Who We Share It With</h2>
        <ul>
          <li><strong>Couriers</strong> (Pargo, The Courier Guy, Dawn Wing) — your name, address, phone for delivery</li>
          <li><strong>Payment gateways</strong> (PayFast, Yoco, Ozow) — your payment details (handled on their sites)</li>
          <li><strong>Supabase</strong> (our database host, EU-based) — your account and order data</li>
          <li><strong>Resend</strong> (our email provider) — your email for transactional emails</li>
        </ul>
        <p>We do <strong>not</strong> sell your data to third parties.</p>

        <h2>5. Your Rights (POPIA)</h2>
        <ul>
          <li>Access — request a copy of your data</li>
          <li>Correction — fix inaccurate data</li>
          <li>Deletion — &ldquo;right to be forgotten&rdquo;</li>
          <li>Object — opt out of marketing</li>
          <li>Complain — to the Information Regulator: <a href="https://www.justice.gov.za/inforeg/" target="_blank" rel="noreferrer">enquiries@inforegulator.org.za</a></li>
        </ul>

        <h2>6. Security</h2>
        <p>Data is encrypted in transit (HTTPS) and at rest (Supabase). Access is restricted to authorised personnel via Supabase Row-Level Security (RLS) policies.</p>

        <h2>7. Cookies &amp; Tracking</h2>
        <p>We use PostHog for anonymous product analytics (no PII shared). We do not use advertising cookies.</p>

        <h2>8. Information Officer</h2>
        <p>For POPIA-related queries, contact our Information Officer at <a href="mailto:privacy@breeez.app">privacy@breeez.app</a>.</p>
      </main>
    </>
  );
}