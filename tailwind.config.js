/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'hsl(18,100%,60%)',
        'primary-dark': 'hsl(18,100%,50%)',
        secondary: 'hsl(210,29%,24%)',
        'secondary-dark': 'hsl(210,29%,18%)',
        accent: 'hsl(142,71%,45%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
