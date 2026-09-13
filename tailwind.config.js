/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        foreground: '#f2f2f0',
        muted: '#71717a',
        'accent-blue': '#38bdf8',
        'accent-green': '#22c55e',
        'accent-amber': '#f59e0b',
      },
      fontFamily: {
        heading: ['Geist', 'sans-serif'],
        body: ['Jost', 'sans-serif'],
        tag: ['Manrope', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
        'font-outfit': ['Outfit', 'sans-serif'],
        oxygen: ['Oxygen', 'sans-serif'],
        'font-oxygen': ['Oxygen', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
