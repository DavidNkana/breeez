import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { brand } from '@/lib/brand';

export const metadata = {
  title: `Delete account — ${brand.name}`,
  description:
    'How to permanently delete your Trends Day-to-Day account, your order history, and your personal data. Required by Apple App Store guidelines.',
  // No index — this is a private action page, no value in search results.
  robots: { index: false, follow: false },
};

export default function DeleteAccountPage() {
  const supportEmail = brand.contact.email;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-3xl font-semibold text-brand-950">Delete your account</h1>
        <p className="mt-2 text-base text-brand-700">
          We're sorry to see you go. Here's exactly what gets deleted and how long it takes.
        </p>

        <section className="mt-8 rounded-lg border border-brand-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-brand-950">What we'll delete</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-brand-700">
            <li>Your sign-in account and password</li>
            <li>Your name, email, phone, saved addresses</li>
            <li>Your order history and saved payment methods</li>
            <li>Your wishlist, cart, and any saved preferences</li>
            <li>Your product reviews you wrote under your name</li>
          </ul>
        </section>

        <section className="mt-6 rounded-lg border border-brand-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-brand-950">What we keep (and why)</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-brand-700">
            <li>
              <strong>Tax records</strong> — South African tax law requires us to keep
              invoices for 5 years. These are kept under your old order number without
              your name or contact details attached.
            </li>
            <li>
              <strong>Anonymised analytics</strong> — aggregate, non-identifying usage
              data (e.g. "10,000 users bought kitchenware this month") that we keep for
              business reporting.
            </li>
          </ul>
        </section>

        <section className="mt-6 rounded-lg border border-brand-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-brand-950">How to request deletion</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-brand-700">
            <li>
              Email <a href={`mailto:${supportEmail}`} className="text-accent-700 underline hover:text-accent-800">{supportEmail}</a> from
              the email address you signed up with. Use the subject line{' '}
              <strong>"Delete my account"</strong>.
            </li>
            <li>
              In your email, include the order number of your most recent purchase (if any).
              This helps us find your account quickly. We will never share this with anyone.
            </li>
            <li>
              We'll reply within <strong>2 business days</strong> to confirm we received
              the request, and complete the deletion within <strong>7 business days</strong> of
              confirmation.
            </li>
            <li>
              You'll get a final confirmation email when the deletion is complete. After
              that, your data is gone from our systems (except the tax records noted above).
            </li>
          </ol>
        </section>

        <section className="mt-6 rounded-lg border border-brand-200 bg-brand-50 p-6">
          <h2 className="text-lg font-semibold text-brand-950">Changed your mind?</h2>
          <p className="mt-2 text-sm text-brand-700">
            You can cancel a deletion request any time before we action it — just reply
            to the confirmation email. After the deletion completes, the account is gone
            for good and you would need to start fresh.
          </p>
        </section>

        <section className="mt-6 rounded-lg border border-brand-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-brand-950">Other ways to reach us</h2>
          <dl className="mt-3 grid gap-3 text-sm text-brand-700 sm:grid-cols-2">
            <div>
              <dt className="font-medium text-brand-900">📧 Email</dt>
              <dd className="mt-1"><a href={`mailto:${supportEmail}`} className="text-accent-700 underline hover:text-accent-800 break-all">{supportEmail}</a></dd>
            </div>
            <div>
              <dt className="font-medium text-brand-900">💬 WhatsApp</dt>
              <dd className="mt-1">
                <a href={brand.contact.whatsappLink} target="_blank" rel="noreferrer noopener" className="text-accent-700 underline hover:text-accent-800">
                  {brand.contact.whatsapp}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-brand-900">📞 Phone</dt>
              <dd className="mt-1">{brand.contact.phone}</dd>
            </div>
            <div>
              <dt className="font-medium text-brand-900">🏢 Address</dt>
              <dd className="mt-1">
                {brand.contact.address.line1}<br />
                {brand.contact.address.line2}, {brand.contact.address.country}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-brand-600">{brand.contact.hours}</p>
        </section>

        <p className="mt-8 text-xs text-brand-400">
          This page exists to satisfy Apple App Store guideline 5.1.1(v) and
          Google Play User Data Policy. It is reachable from the in-app
          Settings screen under "Delete my account".
        </p>
      </main>
      <Footer />
    </>
  );
}
