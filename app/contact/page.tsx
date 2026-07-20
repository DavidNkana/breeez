import { InfoHeader } from '@/components/ui/InfoHeader';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { brand } from '@/lib/brand';

const { contact, social } = brand;

export const metadata = { title: `Contact Us — ${brand.name}` };

export default function ContactPage() {
  return (
    <>
      <Header />
      <InfoHeader title="Contact Us" />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">Get in touch</h1>
        <p className="mt-1 text-sm text-brand-500">We&apos;re here to help.</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-brand-200 bg-white p-5">
            <p className="text-sm font-semibold text-brand-900">📧 Email</p>
            <a href={`mailto:${contact.email}`} className="mt-2 block text-accent-700 hover:underline break-all">
              {contact.email}
            </a>
          </div>

          <div className="rounded-lg border border-brand-200 bg-white p-5">
            <p className="text-sm font-semibold text-brand-900">📞 Phone</p>
            <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="mt-2 block text-accent-700 hover:underline">
              {contact.phone}
            </a>
          </div>

          <div className="rounded-lg border border-brand-200 bg-white p-5">
            <p className="text-sm font-semibold text-brand-900">💬 WhatsApp</p>
            <a href={contact.whatsappLink} target="_blank" rel="noreferrer noopener" className="mt-2 block text-accent-700 hover:underline">
              {contact.whatsapp}
            </a>
          </div>

          <div className="rounded-lg border border-brand-200 bg-white p-5">
            <p className="text-sm font-semibold text-brand-900">🏠 Address</p>
            <p className="mt-2 text-sm text-brand-700 leading-relaxed">
              {contact.address.line1}<br />
              {contact.address.line2}, {contact.address.country}
            </p>
          </div>
        </div>

        <h2 className="mt-10 text-lg font-semibold text-brand-950">Business hours</h2>
        <p className="mt-1 text-sm text-brand-700">{contact.hours}</p>

        <h2 className="mt-10 text-lg font-semibold text-brand-950">Find us online</h2>
        <div className="mt-2 flex flex-wrap gap-3">
          <a href={social.facebook} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-brand-700 hover:bg-brand-50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M22 12.07C22 6.51 17.52 2 12 2S2 6.51 2 12.07C2 17.1 5.66 21.21 10.44 22v-7H7.9v-2.93h2.54V9.85c0-2.51 1.5-3.9 3.78-3.9 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78L18.15 15h-2.5v7C18.34 21.21 22 17.1 22 12.07z" />
            </svg>
            Facebook
          </a>
          <a href={social.twitter} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-brand-700 hover:bg-brand-50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            X
          </a>
          <a href={social.whatsappShare} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-brand-700 hover:bg-brand-50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.373 3.378A11.824 11.824 0 0123.94 11.9c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24z" />
            </svg>
            WhatsApp
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
