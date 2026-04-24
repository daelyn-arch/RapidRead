import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'RapidRead',
        short_name: 'RapidRead',
        description: 'RSVP speed reader with context-aware speed control',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
        // Don't precache the bundled sample EPUBs — they're ~6 MB total and
        // 99% of users won't tap them. Fetch on-demand and cache then.
        globIgnores: ['**/samples/**'],
        runtimeCaching: [
          {
            urlPattern: /\/samples\/.*\.epub$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sample-books',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
