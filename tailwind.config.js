/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#0093FF',
          darkBlue: '#1a365d',
          navy: '#0f172a',
          accent: '#4a90d9',
          lightBlue: '#7bb3e8'
        }
      },
      fontFamily: {
        sans: ['"Noto Sans KR"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
