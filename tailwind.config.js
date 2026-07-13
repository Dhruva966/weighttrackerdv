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
        editorial: ['1.125rem', { lineHeight: '1.8' }],
        display: ['1.6875rem', { lineHeight: '1.25' }],
      },
      colors: {
        bg: '#FFFFFF',
        surface: '#FAFAFA',
        surfaceAlt: '#F5F5F5',
        border: '#E5E5E5',
        divider: '#CCCCCC',
        fg: '#4A3B2A',
        fgMuted: '#999999',
        accent: '#4A3B2A',
        accentSoft: '#4A3B2A14',
        danger: '#B42318',
        pr: '#8B6914',
      },
      boxShadow: {
        card: '0 1px 2px rgba(74, 59, 42, 0.06)',
        soft: '0 8px 24px rgba(74, 59, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
