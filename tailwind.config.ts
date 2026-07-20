import type { Config } from 'tailwindcss';
import { brand } from './lib/brand';

/**
 * Brand palette sourced from /lib/brand.ts (Trends Day-to-Day).
 * brand-* stays neutral/warm slate. accent-* is the Trends red (`#C72E28` → 500).
 *
 * Rename `brand-*` or `accent-*` here ALL THE TIME YOU WANT — search the
 * codebase for those class prefixes.
 */
const { colors } = (() => {
  const hex = (s: string) => s.replace('#', '');
  const tint = (pct: number) => `color-mix(in srgb, ${brand.colors.primary} ${pct}%, white)`;
  const shade = (pct: number) => `color-mix(in srgb, ${brand.colors.primary} ${pct}%, black)`;
  void hex; void tint; void shade;
  return { colors: null as any };
})();

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral base (kept stable — used for chrome)
        brand: {
          50:  '#f4f6f7',
          100: '#e6eaed',
          200: '#c9d2d8',
          300: '#a3b1bb',
          400: '#788a98',
          500: '#566c7d',
          600: '#42566a',
          700: '#374657',
          800: '#2f3a48',
          900: '#29313c',
          950: '#1a1f26'
        },
        // Trends primary red (`#C72E28`) — used for CTAs, badges, links
        accent: {
          50:  '#fef2f2',
          100: '#fde2e2',
          200: '#fbcaca',
          300: '#f8a5a5',
          400: '#f47774',
          500: '#C72E28',  // primary
          600: '#b32620',
          700: '#9a1f19',
          800: '#7f1814',
          900: '#5e1311',
          950: '#3a0a09'
        },
        // Semantic
        success: '#16a34a',
        warning: '#f59e0b',
        danger:  '#dc2626',
        info:    '#2563eb'
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        // Display font for headers — League Spartan is Trends's website font
        display: ['"League Spartan"', 'Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px'
      }
    }
  },
  plugins: []
};

export default config;
