/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { 50: '#FFFBF3', 100: '#FFF6E6', 200: '#F8EAD0', 300: '#EEDAB5' },
        choco: { 50: '#F6EFEA', 100: '#E8D9CE', 200: '#CDB19E', 300: '#AE8468', 400: '#8A5E42', 500: '#6B4429', 600: '#4F301C', 700: '#3A2314', 800: '#28170C', 900: '#1A0F07' },
        caramel: { 100: '#FBE6C8', 200: '#F4CE95', 300: '#E9B060', 400: '#D9953A', 500: '#C07A22', 600: '#9A5F17' },
        berry: { 50: '#FDF1F3', 100: '#FADDE3', 200: '#F3B9C6', 300: '#E994A8', 400: '#DC6F8A', 500: '#C94F6E', 600: '#A63A57' },
        mint: { 100: '#D9F2E3', 500: '#2E9E68', 700: '#1D6B45' },
      },
      fontFamily: {
        display: ['"Baloo 2"', 'ui-rounded', 'system-ui', 'sans-serif'],
        sans: ['"Nunito"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(58,35,20,0.25)',
        pop: '0 6px 0 0 rgba(58,35,20,0.9)',
      },
      borderRadius: { blob: '3.5rem' },
    },
  },
  plugins: [],
}
