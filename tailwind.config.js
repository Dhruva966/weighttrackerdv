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
        bg: '#FAF8F5',
        surface: '#FFFFFF',
        surfaceAlt: '#F3EEE7',
        border: '#E8E2D9',
        divider: '#D4CCC0',
        fg: '#3F3428',
        fgMuted: '#8A8075',
        accent: '#5C4A38',
        accentSoft: '#5C4A3812',
        mist: '#EDE8E1',
        danger: '#A63D32',
        pr: '#8B6914',
      },
      boxShadow: {
        card: '0 1px 2px rgba(63, 52, 40, 0.04)',
        soft: '0 12px 32px rgba(63, 52, 40, 0.06)',
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
