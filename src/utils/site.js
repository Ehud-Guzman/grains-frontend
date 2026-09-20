/**
 * Canonical public origin of the deployment.
 *
 * Every absolute URL the app emits (canonical links, og:*, the JSON-LD Store
 * node, robots.txt's sitemap pointer) previously hardcoded
 * `https://grains-fronten.netlify.app` in seven places across index.html and
 * public/. A custom domain would have broken all of them at once, silently.
 *
 * Set `VITE_SITE_URL` in the Netlify environment (see .env.production). The
 * fallback keeps local dev and existing deploys working unchanged.
 */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'https://grains-fronten.netlify.app'
).replace(/\/+$/, '')

/** Absolute URL for a site-relative path. `absoluteUrl('/shop/abc')`. */
export const absoluteUrl = (path = '/') =>
  `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
