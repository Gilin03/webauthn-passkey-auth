/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#fbf9f4',
          100: '#f7f3ea',
          200: '#f0e9d8',
          300: '#e6dcc4',
        },
        navy: {
          700: '#1e2a3a',
          800: '#162028',
          900: '#0f1820',
        },
        teal: {
          400: '#4db6a9',
          500: '#2d9d8f',
          600: '#238276',
        },
        amber: {
          400: '#f5c842',
          500: '#e6b23a',
          600: '#c99a2e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Pretendard', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
