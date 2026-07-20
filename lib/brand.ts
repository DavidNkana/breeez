/**
 * CENTRAL BRAND CONFIG
 *
 * Every brand-touched string, color, file path, and copy block lives here
 * so rebrands = one-file edits, not find-and-replace through the codebase.
 *
 * Owned by Alex (Portfolio), edited by Chris when Trends assets change.
 */

export const brand = {
  // Identity
  name: 'Trends Day-to-Day',
  short: 'Trends',
  legalName: 'Trends Day-To-Day (Pty) Ltd',
  tagline: 'Shop Smart, Save Big — Every Day.',
  shortDescription:
    'South African multi-category marketplace. Everyday essentials at unbeatable prices — delivered nationwide.',
  founded: 2010,

  // Colors — derived from their actual website (https://www.trendsdaytoday.co.za/)
  colors: {
    primary: '#C72E28',     // signature red (links, CTAs)
    accent: '#D9534F',      // lighter red (hover)
    dark: '#1a1f26',       // headings on white
    text: '#1a1f26',       // body
    muted: '#64748b',      // subtle text
    border: '#e5e7eb',     // borders
    bg: '#ffffff',
    bgAlt: '#fef2f2',      // soft red tint for highlights (red 50)
    bgMuted: '#f8fafc',    // brand-50 equivalent
  },

  // Files (paths are relative to /public so usable in <img src> or CSS url())
  logo: '/brand/logo.png',
  favicon: '/brand/favicon.png',
  ogDefault: '/brand/og-default.png', // we already have opengraph-image.tsx — this is fallback

  // Contact — pulled directly from their site footer
  contact: {
    address: {
      line1: '382 WF Nkomo St',
      line2: 'Pretoria West, Pretoria, 0183',
      country: 'South Africa',
    },
    phone: '+27 12 327 0910',
    whatsapp: '+27 79 457 1253',
    whatsappLink: 'https://api.whatsapp.com/send?phone=27794571253',
    email: 'trendsdaytodayonline@gmail.com',
    hours: 'Mon–Sat 08:00–17:00',
  },

  // Socials
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=100063971679948',
    facebookShare: 'https://www.facebook.com/sharer/sharer.php?u=https://www.trendsdaytoday.co.za/',
    twitter: 'https://x.com/share?url=https://www.trendsdaytoday.co.za/',
    twitterHandle: '@trendsdaytodaySA', // best guess — confirm with their team
    whatsappShare: 'https://api.whatsapp.com/send?text=https%3A%2F%2Fwww.trendsdaytoday.co.za%2F',
    website: 'https://www.trendsdaytoday.co.za',
  },

  // URLs used in OG/canonical/legal — environment-overridable
  get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL || 'https://trends.day-to-day.app').replace(/\/+$/, '');
  },

  // Email subjects (handover to Resend)
  email: {
    fromName: 'Trends Day-to-Day',
    // from address comes from RESEND_FROM_EMAIL env
    replyTo: 'trendsdaytodayonline@gmail.com',
    orderConfirmationSubject: 'Your Trends Day-to-Day order is confirmed',
    orderShippedSubject: 'Your order is on its way',
    newsletterWelcomeSubject: 'Welcome to Trends Day-to-Day',
    returnUpdateSubject: 'Update on your return',
  },

  // Legal
  privacyOfficer: 'Trends Day-To-Day (Pty) Ltd',
  copyrightLine: '© {year} Trends Day-to-Day. Prices in ZAR. POPIA-compliant.',
  whatsappStoreLink: 'https://api.whatsapp.com/send?phone=27794571253&text=Hi%20Trends%20team%2C%20I%27d%20like%20to%20order%20via%20WhatsApp.',

  // About page copy (placeholders, refine after they approve wording)
  about: {
    intro:
      'At Trends Day-to-Day, we believe in making everyday essentials accessible without compromising on quality.',
    founded: 2010,
    mission:
      'Since 2010, we\'ve been committed to providing unbeatable prices and exceptional value to South African homes.',
  },
} as const;

export type Brand = typeof brand;
