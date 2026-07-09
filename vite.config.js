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
        globIgnores: ['**/admin-*.js', '**/driver-*.js', '**/vendor-charts-*.js', '**/vendor-pdf-*.js'],
        // SPA shell for app navigations. This MUST be index.html: Workbox
        // serves navigateFallback for EVERY navigation that isn't itself a
        // precached URL — online or offline. Pointing it at offline.html
        // (as before) made refreshing /shop or opening a shared product link
        // show the offline card until a hard refresh, and installed-PWA
        // shortcuts (/shop, /track) launch straight into it. With index.html
        // precached, deep links now also work fully offline.
        navigateFallback: 'index.html',
        // /admin and /driver are behind auth and change constantly — never
        // serve their navigations from cache.
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
            // StaleWhileRevalidate, NOT CacheFirst: cached copy is served
            // instantly but re-fetched in the background, so a bad cached
            // entry self-heals on the next visit. With CacheFirst, Netlify's
            // SPA rewrite (missing file → index.html, status 200) could get
            // cached AS the image and stick as a broken image for 30 days —
            // unfixable on phones, where there's no hard refresh.
            handler: 'StaleWhileRevalidate',
            options: {
              // v3: cache-name bumps also change sw.js bytes, forcing browsers
              // holding an older SW to install this one — needed because a SW
              // keeps enforcing the CSP headers it was INSTALLED with, so the
              // connect-src fix in public/_headers only reaches clients via a
              // new SW version. (v2 abandoned the CacheFirst-poisoned cache.)
              cacheName: 'image-cache-v3',
              // 0 = opaque cross-origin responses — lets no-cors Cloudinary
              // images actually be cached (CacheFirst was silently refusing)
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true },
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
      // Vite's default preloader eagerly preloads any chunk that's the
      // target of MULTIPLE different lazy import() call sites (its "shared
      // chunk" heuristic) — catches vendor-charts (recharts, used by
      // several admin AND customer pages) and vendor-pdf (jsPDF/html2canvas,
      // used by Receipt + admin reports). Strip them from the root HTML's
      // preload list; they still load normally the moment a page that
      // actually uses them is visited.
      resolveDependencies: (_filename, deps, { hostType }) =>
        hostType === 'html'
          ? deps.filter((dep) => !dep.includes('vendor-charts') && !dep.includes('vendor-pdf'))
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

          // Admin/driver pages are intentionally NOT force-merged into one
          // chunk — that used to make every single admin page visit
          // download all ~20 admin pages' code bundled together (flagged
          // by Lighthouse as unused JS), and made the merged chunk big
          // enough to trip Vite's "shared chunk" eager-preload heuristic
          // on every page, admin or not. Each lazy-loaded page now gets
          // its own natural per-route chunk; chunkFileNames below just
          // prefixes them so they stay easy to identify/exclude.
        },

        chunkFileNames: (chunkInfo) => {
          const id = chunkInfo.facadeModuleId || '';
          if (id.includes('/pages/admin/') || id.includes('/components/admin/')) {
            return 'assets/admin-[name]-[hash].js';
          }
          if (id.includes('/pages/driver/') || id.includes('/components/driver/')) {
            return 'assets/driver-[name]-[hash].js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
})
