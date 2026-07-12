import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Weight Tracker',
        short_name: 'Lift',
        start_url: '/',
        display: 'standalone',
        background_color: '#09090B',
        theme_color: '#00FF88',
        icons: [
          { src: '/favicon.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/favicon.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.includes('supabase.co') && url.pathname.includes('/rest/v1/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-rest',
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
  },
});
