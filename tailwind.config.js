/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Admin panel neutral palette (maps to Tailwind gray scale).
        // NOTE: `earth` below is NOT the same scale — it's white-based and
        // sits one step lighter (earth-100 = admin-50, and it has no
        // equivalent of admin-300 #D1D5DB). Don't try to merge them.
        // The values live in CSS variables (src/index.css, :root) so the admin's dark mode can swap
        // them (src/styles/admin-dark.css) without touching a single class in the pages.
        admin: {
          50:  'rgb(var(--admin-50) / <alpha-value>)',
          100: 'rgb(var(--admin-100) / <alpha-value>)',
          200: 'rgb(var(--admin-200) / <alpha-value>)',
          300: 'rgb(var(--admin-300) / <alpha-value>)',
          400: 'rgb(var(--admin-400) / <alpha-value>)',
          500: 'rgb(var(--admin-500) / <alpha-value>)',
          600: 'rgb(var(--admin-600) / <alpha-value>)',
          700: 'rgb(var(--admin-700) / <alpha-value>)',
          800: 'rgb(var(--admin-800) / <alpha-value>)',
          900: 'rgb(var(--admin-900) / <alpha-value>)',
        },
        // Vittorios brand palette — terracotta/sienna earth tones
        brand: {
          50:  '#FDF6F0',
          100: '#FAE8D8',
          200: '#F4CDAC',
          300: '#ECAD7A',
          400: '#E08A4A',
          500: '#C4622D', // primary terracotta
          600: '#A34E22',
          700: '#833D19',
          800: '#622D12',
          900: '#42200D',
        },
        // Admin shell (sidebar, drawer, dashboard accents) — deep field green. Terracotta
        // `brand` stays the call-to-action colour on top of it. Swap this scale to re-skin
        // the whole admin chrome; nothing else hard-codes the sidebar colour.
        shell: {
          50:  '#F1F7F3',
          100: '#DDEBE2',
          200: '#BCD8C7',
          300: '#8FBBA4',
          400: '#5E9C7D',
          500: '#3F805F',
          600: '#2E6649',
          700: '#244F3A',
          800: '#1A3B2B',
          900: '#142E22',
          950: '#0E2218',
        },
        // Admin page background: a barely-green off-white so white cards lift off it
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        // Storefront neutral scale — white-based, one step lighter than `admin`
        earth: {
          50:  'rgb(var(--surface) / <alpha-value>)',
          100: 'rgb(var(--admin-50) / <alpha-value>)',
          200: 'rgb(var(--admin-100) / <alpha-value>)',
          300: 'rgb(var(--admin-200) / <alpha-value>)',
          400: 'rgb(var(--admin-400) / <alpha-value>)',
          500: 'rgb(var(--admin-500) / <alpha-value>)',
          600: 'rgb(var(--admin-600) / <alpha-value>)',
          700: 'rgb(var(--admin-700) / <alpha-value>)',
          800: 'rgb(var(--admin-800) / <alpha-value>)',
          900: 'rgb(var(--admin-900) / <alpha-value>)',
        },
        // Alias for white kept for the 30+ existing bg-cream usages
        cream: 'rgb(var(--surface) / <alpha-value>)',
        // Card / panel background: white in light mode, a raised dark green in dark mode
        surface: 'rgb(var(--surface) / <alpha-value>)',
        // (`grain` removed 2026-07-17 — defined but never used anywhere)
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        admin: ['Outfit', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'warm':       '0 4px 24px rgba(0, 0, 0, 0.08)',
        'warm-lg':    '0 8px 40px rgba(0, 0, 0, 0.12)',
        'admin':      '0 1px 3px rgba(0, 0, 0, 0.07), 0 1px 2px rgba(0, 0, 0, 0.05)',
        'admin-lg':   '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.05)',
      },
      keyframes: {
        grow:    { '0%': { width: '0%' }, '100%': { width: '100%' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
      animation: {
        'grow':    'grow 6s linear forwards',
        'marquee': 'marquee 28s linear infinite',
      }
    },
  },
  plugins: [],
}
