import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // public/manifest.json is hand-authored (icons, shortcuts, screenshots)
      // and already linked via <link rel="manifest"> in index.html — don't
      // let the plugin generate/inject a second one.
      manifest: false,
      includeManifestIcons: false,
      workbox: {
        // Don't precache the admin/driver/charts/pdf chunks — they're
        // route-lazy and rarely visited by storefront customers. Precaching
        // them would silently download ~1.4MB in the background for every
        // public visitor, undoing the modulepreload split above. They still
        // load normally on demand when someone actually visits those routes.
        globIgnores: ['**/portal-admin-*.js', '**/portal-driver-*.js', '**/vendor-charts-*.js', '**/vendor-pdf-*.js'],
        // /admin and /driver are behind auth and change constantly — never
        // serve them from cache or fall back to the offline page for them.
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/admin/, /^\/driver/],
        runtimeCaching: [
          {
            // Public storefront catalog data only — never orders, auth,
            // payments, or anything under /api/admin or /api/driver.
            urlPattern: ({ url }) =>
              /^\/api\/(products|settings|branches|promotions)(\/|$)/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-catalog-cache',
              networkTimeoutSeconds: 8,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 6 },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],

  build: {
    // Raise the warning threshold slightly — our admin bundle is intentionally
    // larger than the default 500kB limit.
    chunkSizeWarningLimit: 800,

    modulePreload: {
      // By default Vite modulepreloads every chunk reachable via ANY
      // dynamic import(), not just the entry's static graph — so the
      // admin/driver portals (route-lazy, but still reachable from the
      // router config) were being fetched on every public storefront
      // visit. Strip them from the root HTML's preload list; they still
      // get fetched normally the moment someone actually navigates there.
      resolveDependencies: (_filename, deps, { hostType }) =>
        hostType === 'html'
          ? deps.filter((dep) =>
              !dep.includes('portal-admin') && !dep.includes('portal-driver') && !dep.includes('vendor-charts')
            )
          : deps,
    },

    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── Vendor chunks ─────────────────────────────────────────────────
          // Heavy third-party libs are split out so they can be cached
          // independently and don't bloat the app entry point.

          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
            return 'vendor-charts';
          }

          if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }

          if (id.includes('node_modules/axios')) {
            return 'vendor-axios';
          }

          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
            return 'vendor-pdf';
          }

          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }

          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }

          // ── App route chunks ──────────────────────────────────────────────
          // Split by portal so a customer never downloads admin code and
          // vice versa. Path matching is intentionally broad — subdirectories
          // are included automatically.

          if (id.includes('/pages/admin/') || id.includes('/components/admin/')) {
            return 'portal-admin';
          }

          if (id.includes('/pages/driver/') || id.includes('/components/driver/')) {
            return 'portal-driver';
          }

          // customer pages + public shop land in the default entry chunk
        },
      },
    },
  },
})
