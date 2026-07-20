import Link from 'next/link';
import { PaymentMethodsStrip } from '@/components/checkout/PaymentMethodsStrip';
import { NewsletterSignup } from '@/components/marketing/NewsletterSignup';
import { brand } from '@/lib/brand';

const { contact, social } = brand;

const QUICK_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About us' },
  { href: brand.whatsappStoreLink, label: 'WhatsApp Store', external: true },
];

const HELPFUL_LINKS = [
  { href: '/contact', label: 'Contact us' },
  { href: '/legal/returns', label: 'Refunds & Return Policy' },
  { href: '/legal/privacy', label: 'Privacy Policy' },
  { href: '/legal/shipping', label: 'Shipping' },
  { href: '/legal/terms', label: 'Terms & Conditions' },
];

const ACCOUNT_LINKS = [
  { href: '/auth/login', label: 'Sign in' },
  { href: '/auth/register', label: 'Register' },
  { href: '/account/orders', label: 'My orders' },
  { href: '/account/wishlist', label: 'Wishlist' },
  { href: '/account/addresses', label: 'Saved addresses' },
];

function IconLink({ href, label, children, external }: { href: string; label: string; children: React.ReactNode; external?: boolean }) {
  const props = external ? { target: '_blank', rel: 'noreferrer noopener' } : {};
  return (
    <a
      href={href}
      aria-label={label}
      {...props}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition hover:bg-accent-500 hover:text-white"
    >
      {children}
    </a>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 md:mt-24 border-t border-brand-200 bg-brand-50">
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-12">
        {/* Top row: brand + columns */}
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 md:gap-10">
          {/* Brand + contact + socials */}
          <div className="sm:col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brand.logo}
                alt={`${brand.name} logo`}
                className="h-9 w-auto"
              />
            </Link>
            <p className="mt-3 text-sm text-brand-700 leading-relaxed max-w-xs">
              {brand.tagline}
            </p>
            <div className="mt-4 max-w-xs">
              <NewsletterSignup variant="inline" />
            </div>
            <div className="mt-4 flex items-center gap-2" aria-label="Social links">
              <IconLink href={social.facebook} label="Trends on Facebook">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M22 12.07C22 6.51 17.52 2 12 2S2 6.51 2 12.07C2 17.1 5.66 21.21 10.44 22v-7H7.9v-2.93h2.54V9.85c0-2.51 1.5-3.9 3.78-3.9 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78L18.15 15h-2.5v7C18.34 21.21 22 17.1 22 12.07z" />
                </svg>
              </IconLink>
              <IconLink href={social.twitter} label="Trends on X (Twitter)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </IconLink>
              <IconLink href={social.whatsappShare} label="Trends on WhatsApp">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.373 3.378A11.824 11.824 0 0123.94 11.9c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.591 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.89-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.982zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              </IconLink>
            </div>
          </div>

          {/* Quick links (mirrors their footer) */}
          <div>
            <p className="text-sm font-semibold text-brand-900 mb-3">Our Links</p>
            <ul className="space-y-2 text-sm text-brand-700">
              {QUICK_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    {...(l.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                    className="hover:text-accent-600 hover:underline"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Useful (contact + policy) */}
          <div>
            <p className="text-sm font-semibold text-brand-900 mb-3">Useful Links</p>
            <ul className="space-y-2 text-sm text-brand-700">
              {HELPFUL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-accent-600 hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href={social.facebookShare}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-accent-600 hover:underline"
                >
                  Share on Facebook
                </a>
              </li>
              <li>
                <a
                  href={social.twitter}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-accent-600 hover:underline"
                >
                  Share on X
                </a>
              </li>
            </ul>
          </div>

          {/* Account + contact */}
          <div>
            <p className="text-sm font-semibold text-brand-900 mb-3">My Account</p>
            <ul className="space-y-2 text-sm text-brand-700">
              {ACCOUNT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-accent-600 hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-5 space-y-1 text-xs text-brand-600">
              <p className="font-semibold text-brand-800">Contact</p>
              <p>{contact.address.line1}<br />{contact.address.line2}</p>
              <p>Phone: <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="hover:underline">{contact.phone}</a></p>
              <p>WhatsApp: <a href={contact.whatsappLink} target="_blank" rel="noreferrer noopener" className="hover:underline">{contact.whatsapp}</a></p>
              <p>Email: <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a></p>
            </div>
          </div>
        </div>

        {/* Payment methods trust strip */}
        <div className="mt-8 border-t border-brand-200 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-500 mb-3">
            Accepted payment methods
          </p>
          <PaymentMethodsStrip size="sm" showLabel />
        </div>
      </div>

      {/* Copyright bar */}
      <div className="border-t border-brand-200">
        <div className="mx-auto max-w-6xl px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-brand-500">
          <p>{brand.copyrightLine.replace('{year}', String(new Date().getFullYear()))}</p>
          <p>
            <a href={social.website} target="_blank" rel="noreferrer noopener" className="hover:underline">
              {social.website.replace(/^https?:\/\//, '')}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
