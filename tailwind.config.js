/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1F3A5F',
        accent: '#D9730D',
      }
    },
  },
  plugins: [],
}
