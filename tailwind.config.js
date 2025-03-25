/** @type {import('tailwindcss').Config} */

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
      },
      animation: {
        'progress': 'progressAnimation 10s linear',
        'recording-pulse': 'recording-pulse 1.5s infinite',
      },
      keyframes: {
        progressAnimation: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        'recording-pulse': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.1)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
