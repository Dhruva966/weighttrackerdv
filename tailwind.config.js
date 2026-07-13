/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"EB Garamond"', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        editorial: ['1.125rem', { lineHeight: '1.85' }],
        display: ['1.75rem', { lineHeight: '1.2' }],
      },
      colors: {
        bg: '#F3F7F2',
        surface: '#FFFFFF',
        surfaceAlt: '#E7F0E8',
        border: '#D5E2D7',
        divider: '#B9CBBE',
        fg: '#24352A',
        fgMuted: '#6B7C70',
        accent: '#3D6B4F',
        accentSoft: '#3D6B4F14',
        mist: '#E4EDE6',
        danger: '#A63D32',
        pr: '#6B7F2A',
      },
      boxShadow: {
        card: '0 1px 2px rgba(36, 53, 42, 0.04)',
        soft: '0 12px 32px rgba(36, 53, 42, 0.06)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 0.45s ease-out both',
      },
    },
  },
  plugins: [],
};
