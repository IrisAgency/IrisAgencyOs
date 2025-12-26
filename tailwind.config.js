/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dynamic colors using CSS variables from branding config
        primary: {
          DEFAULT: 'var(--brand-primary, #e11d48)',
          hover: 'var(--brand-primary-hover, #be123c)',
        },
        'iris-red': 'var(--brand-primary, #e11d48)',
        'iris-black': 'var(--brand-secondary, #0f172a)',
        'iris-white': '#ffffff',
        'iris-accent': 'var(--brand-accent, #6366f1)',
        'iris-sidebar': 'var(--brand-sidebar, #0f172a)',
        'iris-bg': 'var(--brand-bg, #ffffff)',
        'iris-text': 'var(--brand-text, #0f172a)',
      },
      fontFamily: {
        display: ['var(--brand-font, Inter)', 'sans-serif'],
        sans: ['var(--brand-font, Inter)', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '1rem', // 16px
      },
    },
  },
  plugins: [],
}
