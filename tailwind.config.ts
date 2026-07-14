import type { Config } from 'tailwindcss';

/**
 * Breeez brand palette — original, intentionally NOT a Trends clone.
 * Warm neutral base + soft accent. Modern ecommerce feel.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Breeez brand
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
        accent: {
          50:  '#fff8ed',
          100: '#ffeed1',
          200: '#ffd99e',
          300: '#ffbe5e',
          400: '#ff9d2e',
          500: '#f98212',
          600: '#ea620c',
          700: '#c2470b',
          800: '#9a3912',
          900: '#7e3113',
          950: '#451608'
        },
        // Semantic
        success: '#16a34a',
        warning: '#f59e0b',
        danger:  '#dc2626',
        info:    '#2563eb'
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', 'system-ui', 'sans-serif']
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