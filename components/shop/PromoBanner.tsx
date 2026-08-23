'use client';

import Link from 'next/link';

type PromoBannerProps = {
  /** Public CDN URL for the background image (Unsplash, Pexels, etc.) */
  imageUrl: string;
  /** Optional alt text describing the image (recommend for a11y) */
  alt?: string;
  /** Small uppercase eyebrow above the headline */
  eyebrow?: string;
  /** Main headline. Shown in white over the image. */
  headline: string;
  /** Supporting copy under the headline */
  subheadline?: string;
  /** Where "Shop now" goes. Defaults to /categories. */
  ctaHref?: string;
  /** CTA label. Defaults to "Shop now". */
  ctaLabel?: string;
  /** Image overlay darkening (0 = none, 1 = pitch black). 0..1. Default 0.55. */
  overlayOpacity?: number;
  /**
   * Text alignment inside the banner.
   * - left (default): copy pinned to left, image fills behind.
   * - center: copy centered (mobile default if prop omitted).
   */
  align?: 'left' | 'center';
  /**
   * Section tone used for spacing above/below when stacked. Most callers
   * shouldn't need to touch this.
   */
  className?: string;
};

/**
 * Full-bleed marketing banner with image + headline + sub-copy + CTA.
 * Mobile-first text overlay; on md+ the copy stays left-aligned and the
 * image gets a subtle dark gradient so the white copy stays readable on
 * any photo.
 */
export function PromoBanner({
  imageUrl,
  alt = '',
  eyebrow,
  headline,
  subheadline,
  ctaHref = '/categories',
  ctaLabel = 'Shop now',
  overlayOpacity = 0.55,
  align = 'left',
  className = ''
}: PromoBannerProps) {
  // Clamp overlay into a safe range so an honest typo doesn't render white-on-white.
  const opacity = Math.max(0, Math.min(1, overlayOpacity));
  const alignClass = align === 'center' ? 'text-center items-center' : 'text-left items-start';

  return (
    <section
      className={`relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden ${className}`}
      aria-label={headline}
    >
      {/* Background image. Lazy on mobile to keep LCP snappy. */}
      <div className="relative h-[440px] sm:h-[520px] md:h-[560px]">
        <img
          src={imageUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Dark overlay — gradient is stronger on the left so left-aligned copy stays readable
            regardless of the photo's lighting. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              align === 'left'
                ? `linear-gradient(90deg, rgba(0,0,0,${Math.min(1, opacity + 0.15)}) 0%, rgba(0,0,0,${opacity * 0.6}) 45%, rgba(0,0,0,${opacity * 0.25}) 100%)`
                : `linear-gradient(180deg, rgba(0,0,0,${opacity * 0.55}) 0%, rgba(0,0,0,${opacity}) 100%)`
          }}
          aria-hidden="true"
        />

        {/* Copy */}
        <div className="relative z-10 mx-auto flex h-full max-w-6xl items-center px-4">
          <div className={`flex max-w-xl flex-col gap-3 ${alignClass} text-white`}>
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
                {eyebrow}
              </p>
            )}
            <h2 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
              {headline}
            </h2>
            {subheadline && (
              <p className="max-w-md text-sm text-white/90 sm:text-base md:max-w-lg">
                {subheadline}
              </p>
            )}
            <div className="mt-2">
              <Link
                href={ctaHref}
                className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-brand-950 shadow-md transition-colors hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
              >
                {ctaLabel}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
