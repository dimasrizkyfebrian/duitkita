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
      // UpdatePrompt.vue — see useRegisterSW there. With injectManifest
      // (below), src/sw.ts is the one that has to actually honour this by
      // waiting for an explicit SKIP_WAITING message instead of calling
      // self.skipWaiting() on its own.
      registerType: 'prompt',
      // injectManifest (not the default generateSW) because push
      // notifications need a 'push'/'notificationclick' listener in the
      // service worker itself — generateSW only lets you configure
      // precaching, it can't add custom event listeners. src/sw.ts is
      // handwritten and precacheAndRoute(self.__WB_MANIFEST) replaces what
      // generateSW used to assemble from the workbox config below.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // Off because it bypasses globIgnores below: left on, the plugin
      // appends every manifest icon to the precache list after the globs
      // have been filtered, which quietly put both 512px icons (~630KB
      // combined) back into the install payload. They're still served
      // normally — the OS fetches them once at install time, which is the
      // only moment anything reads them.
      includeManifestIcons: false,
      injectManifest: {
        // App is online-only by design (no offline data sync), so only the
        // app shell (static assets) is precached — API calls are never cached.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Icons the OS reads once (install, splash, Add to Home Screen) and
        // the app itself never renders. Precaching them would more than
        // double the install payload every user pays on first visit for
        // bytes no screen ever shows. icon-192 and badge-96 deliberately
        // stay precached — the service worker draws push notifications with
        // them while the app is closed, so they have to be in the cache.
        globIgnores: [
          '**/icons/icon-512.png',
          '**/icons/icon-maskable-512.png',
          '**/icons/apple-touch-icon.png',
        ],
      },
      manifest: {
        name: 'DuitKita',
        short_name: 'DuitKita',
        // Defaults to 'en' otherwise, which mislabels an entirely
        // Indonesian app to app stores and assistive tech.
        lang: 'id',
        description: 'Atur duit bareng pasangan, gampang dan rapi.',
        theme_color: '#0D47A1',
        // Matches --color-ink, the app's own background. The splash screen
        // shows this behind the icon, so a light value here flashed white
        // before handing over to a dark first screen.
        background_color: '#071C3C',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
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
