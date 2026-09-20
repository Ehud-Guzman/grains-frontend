import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// ── Site files (robots.txt + sitemap.xml) ─────────────────────────────────────
// These used to be static files in public/ with the production origin hardcoded:
// `https://grains-fronten.netlify.app` appeared in robots.txt's Sitemap pointer
// and in all 8 sitemap <loc> entries. Moving to a custom domain would have
// silently broken every absolute URL at once.
//
// Generated at build time instead, from VITE_SITE_URL (falling back to the
// current production origin so existing deploys don't change behaviour).
// index.html's og:*/JSON-LD origins come from the same variable via Vite's
// built-in `%VITE_SITE_URL%` HTML substitution.
//
// Product pages (/shop/:id) are still intentionally excluded: the list changes
// with stock, and listing them accurately needs a backend-generated sitemap
// (see the FRONTEND-AUDIT note). They stay crawlable via internal links.
const SITEMAP_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/shop', changefreq: 'daily', priority: '0.9' },
  { path: '/compare-prices', changefreq: 'weekly', priority: '0.5' },
  { path: '/track', changefreq: 'monthly', priority: '0.3' },
  { path: '/register', changefreq: 'monthly', priority: '0.4' },
  { path: '/login', changefreq: 'monthly', priority: '0.2' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.2' },
  { path: '/terms', changefreq: 'yearly', priority: '0.2' },
]

// Mirrors the previous static robots.txt. Authenticated/transactional routes are
// excluded so they don't compete with catalogue pages in search results.
const ROBOTS_DISALLOW = ['/admin', '/driver', '/dashboard', '/checkout', '/cart']

function siteFilesPlugin() {
  let siteUrl = 'https://grains-fronten.netlify.app'
  let outDir = 'dist'

  return {
    name: 'vittorios-site-files',
    apply: 'build',
    config(_config, { mode }) {
      const env = loadEnv(mode, process.cwd(), '')
      siteUrl = (env.VITE_SITE_URL || siteUrl).replace(/\/+$/, '')
    },
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const lastmod = new Date().toISOString().slice(0, 10)
      const urls = SITEMAP_ROUTES.map(
        (r) => `  <url>
    <loc>${siteUrl}${r.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
      ).join('\n')

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

      const robots = `User-agent: *
Allow: /
${ROBOTS_DISALLOW.map((p) => `Disallow: ${p}`).join('\n')}

Sitemap: ${siteUrl}/sitemap.xml
`

      fs.mkdirSync(outDir, { recursive: true })
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap)
      fs.writeFileSync(path.join(outDir, 'robots.txt'), robots)
      this.warn?.(`site files generated for ${siteUrl}`)
    },
  }
}

export default defineConfig({

  // ── TEST (vitest) ───────────────────────────────────────────────────────────
  // Read by `vitest` when it loads this same config file. Kept here rather than
  // a second config so tests and the app resolve modules identically.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    restoreMocks: true,
    // The PWA plugin rewrites the HTML entry; irrelevant and slow in tests.
    // (vitest ignores it for non-HTML transforms, so no extra config needed.)
  },

  plugins: [
    siteFilesPlugin(),
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
            // /api/settings/receipt is verifyToken-gated (shop KRA PIN etc.) —
            // excluded via the negative lookahead so an authenticated response
            // never lands in a cache readable from a shared/public device.
            urlPattern: ({ url }) =>
              /^\/api\/(products|branches|promotions)(\/|$)|^\/api\/settings(?!\/receipt)(\/|$)/.test(url.pathname),
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
              // v4: cache-name bumps also change sw.js bytes, forcing browsers
              // holding an older SW to install this one — needed because a SW
              // keeps enforcing the CSP headers it was INSTALLED with, so a
              // connect-src change in public/_headers only reaches clients via
              // a new SW version. (v3 added Cloudinary; v4 added GA4/Sentry.
              // v2 abandoned the earlier CacheFirst-poisoned cache.) Bump this
              // again any time _headers' CSP changes.
              cacheName: 'image-cache-v4',
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

          if (id.includes('node_modules/@sentry')) {
            return 'vendor-sentry';
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
