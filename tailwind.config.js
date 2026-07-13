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
        bg: '#FFFEFB',
        surface: '#FFFFFF',
        surfaceAlt: '#F6F0E4',
        border: '#E6DDCE',
        divider: '#D4C8B4',
        fg: '#2B261C',
        fgMuted: '#7A7164',
        accent: '#C4A35A',
        accentSoft: '#C4A35A1F',
        mist: '#F3EBDA',
        danger: '#A63D32',
        pr: '#B08D3A',
      },
      boxShadow: {
        card: '0 1px 2px rgba(43, 38, 28, 0.04)',
        soft: '0 12px 32px rgba(43, 38, 28, 0.06)',
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
