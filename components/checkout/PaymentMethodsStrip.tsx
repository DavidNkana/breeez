/**
 * PaymentMethodsStrip — visual trust strip of accepted payment marks.
 *
 * Why inline SVG instead of image files:
 *   - Zero HTTP requests, zero 404 risk, zero bundled binary assets
 *   - Perfect rendering at any size (1×, 2×, 3× DPR)
 *   - Each SVG uses official brand colours
 *   - Trivial to update — edit a string, not Photoshop
 *
 * Shows the 6 most-trusted SA + global payment methods so users
 * recognise their card / app instantly at checkout and in the footer.
 */
import type { SVGProps } from 'react';

type PaymentMethod = {
  id: string;
  name: string;
  // Simple, accessible label
  alt: string;
  // Inline SVG component
  Logo: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  // When is this method available?
  available: 'live' | 'planned' | 'south_africa_only';
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'visa',
    name: 'Visa',
    alt: 'Visa',
    available: 'live',
    Logo: (p) => (
      <svg viewBox="0 0 750 471" xmlns="http://www.w3.org/2000/svg" {...p}>
        <path
          fill="#1A1F71"
          d="M278.197 75.836h-58.241l-36.413 224.124h58.241l36.413-224.124zM170.667 75.836L115.96 254.516l-6.211-30.43-21.411-110.281h-.531s-3.323-13.937-21.945-22.779l-78.962-15.19-1.062 5.291s28.792 6.353 58.835 22.252c15.36 8.025 18.466 15.018 21.945 28.402l31.499 143.18h62.235l90.197-224.124h-58.526zm398.2 0h-44.411s-15.18 4.227-22.107 21.198l-86.838 202.926h61.851s10.108-26.329 12.412-32.123h75.553s4.227 27.927 14.65 32.123h55.046l-65.135-224.124h-1.012zm-63.987 144.114c5.103-13.04 24.61-63.055 24.61-63.055s3.587-9.875 5.815-16.144l3.012 14.547s11.811 53.717 14.275 64.652h-47.712zm44.057-83.685l-19.683-50.93-25.5 50.93h45.183zM629.999 213.892c0-50.07 39.388-83.685 78.811-83.685 12.604 0 22.15 4.227 26.808 7.483l-7.446 53.162s-12.301-5.795-23.945-5.795c-21.945 0-33.807 16.123-33.807 33.117 0 18.85 16.372 28.402 32.747 28.402 12.604 0 23.945-7.483 23.945-7.483l-7.446 50.93s-13.665 11.844-41.74 11.844c-41.583 0-77.927-30.522-77.927-87.974zM581.243 75.836l-37.476 224.124h-56.804l37.476-224.124h56.804z"
        />
      </svg>
    ),
  },
  {
    id: 'mastercard',
    name: 'Mastercard',
    alt: 'Mastercard',
    available: 'live',
    Logo: (p) => (
      <svg viewBox="0 0 750 471" xmlns="http://www.w3.org/2000/svg" {...p}>
        <circle cx="375" cy="235" r="180" fill="#EB001B" />
        <circle cx="525" cy="235" r="180" fill="#F79E1B" />
        <path
          fill="#FF5F00"
          d="M375 95.7c-49.7 0-93.8 26.2-117.6 65.4-23.8 39.2-23.8 87.7 0 127 23.8 39.2 67.9 65.4 117.6 65.4s93.8-26.2 117.6-65.4c23.8-39.2 23.8-87.7 0-127C468.8 121.9 424.7 95.7 375 95.7z"
        />
        <path
          fill="#F79E1B"
          d="M375 95.7c-49.7 0-93.8 26.2-117.6 65.4-23.8 39.2-23.8 87.7 0 127 23.8 39.2 67.9 65.4 117.6 65.4 49.7 0 93.8-26.2 117.6-65.4 23.8-39.2 23.8-87.7 0-127C468.8 121.9 424.7 95.7 375 95.7z"
        />
      </svg>
    ),
  },
  {
    id: 'amex',
    name: 'American Express',
    alt: 'American Express',
    available: 'live',
    Logo: (p) => (
      <svg viewBox="0 0 750 471" xmlns="http://www.w3.org/2000/svg" {...p}>
        <rect width="750" height="471" rx="40" fill="#2E77BC" />
        <text
          x="375"
          y="220"
          fontFamily="Arial, sans-serif"
          fontWeight="900"
          fontSize="160"
          fill="white"
          textAnchor="middle"
          letterSpacing="-4"
        >
          AMEX
        </text>
        <text
          x="375"
          y="340"
          fontFamily="Arial, sans-serif"
          fontWeight="700"
          fontSize="80"
          fill="white"
          textAnchor="middle"
          letterSpacing="2"
        >
          CARD
        </text>
      </svg>
    ),
  },
  {
    id: 'apple-pay',
    name: 'Apple Pay',
    alt: 'Apple Pay',
    available: 'planned',
    Logo: (p) => (
      <svg viewBox="0 0 750 471" xmlns="http://www.w3.org/2000/svg" {...p}>
        <g transform="translate(195, 110)">
          <path
            fill="currentColor"
            d="M205.9 153.9c-1.6 36-29.4 53.7-30.2 54.5-15.4 11.1-31.4 12.6-43.7 12.8-17.7.3-34.5-10.4-45.4-10.4-11.4 0-28.2 10.1-46.4 9.8-19-.3-36.5-12.2-46.4-31-19.8-37.7-4.4-93.5 14-124.2 9.2-15.3 20.1-32.4 34.3-31.8 13.6.6 18.6 8.7 34.9 8.7 16.1 0 21-8.7 35.3-8.4 14.4.3 23.5 14.7 32.7 30 9.7 16.4 13.7 33.4 13.9 34.2-0.3.2-26.7 10.2-27 40.7z M155.7 23.8c7.5-9.1 12.6-21.8 11.2-34.5-10.9.4-24 7.3-31.8 16.4-7 8-13.1 20.9-11.4 33.3 12.1.9 24.5-6.1 32-15.2z"
          />
          <text
            x="265"
            y="155"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif"
            fontWeight="600"
            fontSize="140"
            fill="currentColor"
          >
            Pay
          </text>
        </g>
      </svg>
    ),
  },
  {
    id: 'payfast',
    name: 'PayFast',
    alt: 'PayFast — Instant EFT, card, SnapScan, Zapper',
    available: 'south_africa_only',
    Logo: (p) => (
      <svg viewBox="0 0 800 471" xmlns="http://www.w3.org/2000/svg" {...p}>
        <rect width="800" height="471" rx="40" fill="white" stroke="#E5E7EB" strokeWidth="2" />
        <text
          x="60"
          y="270"
          fontFamily="Arial, sans-serif"
          fontWeight="900"
          fontSize="120"
          fill="#EE3A3F"
        >
          Pay
        </text>
        <text
          x="280"
          y="270"
          fontFamily="Arial, sans-serif"
          fontWeight="900"
          fontSize="120"
          fill="#1A1A1A"
        >
          Fast
        </text>
        <text
          x="60"
          y="330"
          fontFamily="Arial, sans-serif"
          fontWeight="600"
          fontSize="32"
          fill="#666"
        >
          Instant EFT &amp; Cards
        </text>
      </svg>
    ),
  },
  {
    id: 'paypal',
    name: 'PayPal',
    alt: 'PayPal',
    available: 'planned',
    Logo: (p) => (
      <svg viewBox="0 0 1000 320" xmlns="http://www.w3.org/2000/svg" {...p}>
        <path
          fill="#003087"
          d="M166.4 25.4h121c66.7 0 105 32.7 96.1 95.2-9.6 67.8-55.3 99.4-122 99.4h-39.8l-17.8 113H150L166.4 25.4z"
        />
        <path
          fill="#009cde"
          d="M307.4 144.8c-3.4 19.5-12.6 36.6-26.8 49.7-21.1 19.3-51.9 29.8-91.1 29.8h-49.5l-17.8 113H72.4c-7.6 0-13.1-6.9-11.6-14.5L93.7 25.4c1.4-7.6 7.9-13.2 15.6-13.2h121c19.5 0 36.1 1.7 49.5 5.1 13.4 3.4 24.5 8.9 33.1 16.4 7.5 6.5 12.7 14.5 15.7 23.8 2.9 9.1 3.8 19.5 3.4 31-.2 5.7-.6 11-1.5 16.3z"
        />
      </svg>
    ),
  },
];

/**
 * The default strip — 6 methods, used in checkout + footer.
 * Pass `size="sm"` for compact footer, default for checkout.
 */
export function PaymentMethodsStrip({
  size = 'md',
  showLabel = false,
  className = '',
}: {
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}) {
  const iconHeight = size === 'sm' ? 18 : 32;
  const iconWidth = size === 'sm' ? 28 : 48;
  const gap = size === 'sm' ? 'gap-2' : 'gap-3';

  return (
    <div className={`flex flex-wrap items-center ${gap} ${className}`}>
      {PAYMENT_METHODS.map((m) => (
        <div
          key={m.id}
          title={m.alt}
          aria-label={m.alt}
          className="inline-flex items-center justify-center rounded border border-brand-200 bg-white px-1.5 py-1 shadow-sm transition hover:border-brand-300 hover:shadow"
          style={{ height: iconHeight + 8 }}
        >
          <m.Logo
            width={iconWidth}
            height={iconHeight}
            className="text-brand-900"
            aria-hidden="true"
          />
        </div>
      ))}
      {showLabel && (
        <span className="ml-2 text-xs text-brand-500">Secure checkout · 256-bit SSL</span>
      )}
    </div>
  );
}
