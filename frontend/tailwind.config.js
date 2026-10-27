/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Onest', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        canvas: '#F0F2F5',
        brand: {
          50: '#f8fafc',
          100: '#f1f5f9',
          500: '#334155',
          600: '#1e293b',
          700: '#0f172a',
          900: '#141824',
        },
      },
      boxShadow: {
        'card': '0 2px 8px -1px rgba(15, 23, 42, 0.05), 0 1px 3px -1px rgba(15, 23, 42, 0.03)',
        'card-hover': '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 10px -2px rgba(15, 23, 42, 0.03)',
        'sidebar': '2px 0 12px -2px rgba(15, 23, 42, 0.03)',
      }
    },
  },
  plugins: [],
}
