/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        heading: ['Outfit', 'Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          accent: '#0066FF',
          heading: '#0D0F12',
          muted: '#868E9C',
          border: '#E8EAED',
          bg: '#F7F8FA',
        },
      },
    },
  },
  plugins: [],
};
