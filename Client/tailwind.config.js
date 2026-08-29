/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f2f5f9', 100: '#e2e8f0', 200: '#c7d2e0',
          300: '#9fb1c9', 400: '#6f88ab', 500: '#4e6a90',
          600: '#3d5476', 700: '#334660', 800: '#1e293b',
          900: '#1b2942', 950: '#111c2e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
