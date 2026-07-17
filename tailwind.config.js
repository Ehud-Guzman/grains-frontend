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
        admin: {
          50:  '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
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
        // Storefront neutral scale — white-based, one step lighter than `admin`
        earth: {
          50:  '#FFFFFF',
          100: '#F9FAFB',
          200: '#F3F4F6',
          300: '#E5E7EB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        // Alias for white kept for the 30+ existing bg-cream usages
        cream: '#FFFFFF',
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
