/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cricket: {
          dark: '#0a0e17',
          card: '#121826',
          border: '#1f293d',
          gold: '#f59e0b',
          accent: '#3b82f6',
        }
      }
    },
  },
  plugins: [],
}
