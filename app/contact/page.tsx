import { InfoHeader } from '@/components/ui/InfoHeader';

export const metadata = { title: 'Contact Us — Breeez' };

export default function ContactPage() {
  return (
    <>
      <InfoHeader title="Contact Us" />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom prose prose-sm prose-headings:text-brand-950 prose-a:text-accent-700">
        <h1>Contact us</h1>
        <p className="text-sm text-brand-500">We&apos;re here to help.</p>

        <h2>Email</h2>
        <p>
          General: <a href="mailto:support@breeez.app">support@breeez.app</a><br />
          Orders: <a href="mailto:orders@breeez.app">orders@breeez.app</a><br />
          Returns: <a href="mailto:returns@breeez.app">returns@breeez.app</a>
        </p>

        <h2>Response times</h2>
        <p>We aim to respond within 1 business day. For urgent order issues, include your order number in the subject line.</p>

        <h2>Phone & WhatsApp</h2>
        <p>Coming soon. For now, email is the fastest way to reach us.</p>

        <h2>Business hours</h2>
        <p>Monday to Friday, 9am – 5pm SAST. Closed weekends and public holidays.</p>

        <h2>Office</h2>
        <p>Cape Town, South Africa</p>
      </main>
    </>
  );
}