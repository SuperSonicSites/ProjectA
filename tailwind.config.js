/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./layouts/**/*.html",
    "./content/**/*.md",
    "./themes/visual-sanctuary-theme/layouts/**/*.html",
    "./themes/visual-sanctuary-theme/assets/js/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        stone: {
          50: '#FAFAF9', // Page BG
        },
        indigo: {
          600: '#4F46E5', // Primary
          700: '#4338CA', // Primary Hover
        },
        rose: {
          500: '#F43F5E', // Accent
        },
        slate: {
          800: '#1E293B', // Text Main
          700: '#334155', // Secondary Text
          600: '#475569', // Body Text
          500: '#64748B', // Muted Text
        }
      }
    },
  },
  plugins: [],
}
