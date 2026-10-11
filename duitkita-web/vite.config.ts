import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    VitePWA({
      // 'prompt' (not 'autoUpdate'): autoUpdate makes vite-plugin-pwa set
      // skipWaiting + clientsClaim, so a new service worker takes over an
      // already-open session the instant it finishes installing — which can
      // land mid-request and abort an in-flight API call with a generic
      // "network error" even though the server received and processed it
      // (e.g. an expense gets created, but the client never sees the
      // response). 'prompt' lets the new worker install in the background
      // and only take over once the user explicitly asks to reload, via
      // UpdatePrompt.vue — see useRegisterSW there.
      registerType: 'prompt',
      // App is online-only by design (no offline data sync), so only the
      // app shell (static assets) is precached — API calls are never cached.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'DuitKita',
        short_name: 'DuitKita',
        description: 'Couples budgeting app',
        theme_color: '#0D47A1',
        background_color: '#E3F2FD',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
