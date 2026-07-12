/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#09090B',
        surface: '#18181B',
        surfaceAlt: '#27272A',
        border: '#3F3F46',
        fg: '#FAFAFA',
        fgMuted: '#A1A1AA',
        accent: '#00FF88',
        accentSoft: '#00FF8830',
        danger: '#FF4B4B',
        pr: '#FFD400',
      },
      boxShadow: {
        glow: '0 0 24px rgba(0, 255, 136, 0.28)',
        'glow-soft': '0 0 18px rgba(0, 255, 136, 0.14)',
        card: '0 20px 50px rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
}
