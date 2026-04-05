/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Admin panel neutral palette (maps to Tailwind gray scale)
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
        // Vittorios brand palette — warm earthy tones
        brand: {
          50:  '#FDF8F2',
          100: '#FAF0E0',
          200: '#F5DFB8',
          300: '#EECA8A',
          400: '#E4AE55',
          500: '#C8912A', // primary amber
          600: '#A8751F',
          700: '#8B5E18',
          800: '#6D4912',
          900: '#4A300C',
        },
        earth: {
          50:  '#FAF7F2',
          100: '#F0E8D8',
          200: '#DDD0BB',
          300: '#C5B094',
          400: '#A8906E',
          500: '#8B7355',
          600: '#6E5A40',
          700: '#52432F',
          800: '#3D3020',
          900: '#1C1410', // deep dark
        },
        cream: '#FAF7F2',
        grain: '#C8912A',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        admin: ['Outfit', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'warm':       '0 4px 24px rgba(139, 94, 24, 0.12)',
        'warm-lg':    '0 8px 40px rgba(139, 94, 24, 0.18)',
        'admin':      '0 1px 3px rgba(0, 0, 0, 0.07), 0 1px 2px rgba(0, 0, 0, 0.05)',
        'admin-lg':   '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
