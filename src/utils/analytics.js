// GA4 wrapper. No-ops entirely unless VITE_GA_MEASUREMENT_ID is set AND this
// is a production build — mirrors the backend's NODE_ENV==='production' gate
// for Sentry (see backend/src/app.js), so local dev never pollutes real
// analytics even if the env var leaks into a dev .env by mistake.
const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID

let initialized = false

export function initAnalytics() {
  if (initialized || !MEASUREMENT_ID || !import.meta.env.PROD) return
  initialized = true

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() { window.dataLayer.push(arguments) }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
  document.head.appendChild(script)

  window.gtag('js', new Date())
  // Automatic page_view disabled — RouteTracker sends one on every SPA
  // navigation (including the first), so all page views go through one path.
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false })
}

const send = (name, params = {}) => {
  if (!initialized || typeof window.gtag !== 'function') return
  window.gtag('event', name, params)
}

export const trackPageView = (path) =>
  send('page_view', { page_path: path, page_location: window.location.href })

export const trackViewItem = (product, packaging) => send('view_item', {
  currency: 'KES',
  value: packaging?.priceKES ?? 0,
  items: [{
    item_id: product._id,
    item_name: product.name,
    item_category: product.category,
    price: packaging?.priceKES,
  }],
})

export const trackAddToCart = (product, variety, packaging, quantity) => send('add_to_cart', {
  currency: 'KES',
  value: (packaging.priceKES || 0) * quantity,
  items: [{
    item_id: product._id,
    item_name: product.name,
    item_variant: variety.varietyName,
    price: packaging.priceKES,
    quantity,
  }],
})

export const trackBeginCheckout = (cartItems, value) => send('begin_checkout', {
  currency: 'KES',
  value,
  items: cartItems.map(i => ({
    item_id: i.productId,
    item_name: i.productName,
    item_variant: i.variety,
    price: i.priceKES,
    quantity: i.quantity,
  })),
})

export const trackPurchase = (order, cartItems) => send('purchase', {
  // GA4 dedupes purchase events by transaction_id — using the human-facing
  // orderRef (unique per branch+order) keeps this safe even if this ever
  // fires twice for the same order.
  transaction_id: order.orderRef,
  currency: 'KES',
  value: order.total,
  items: cartItems.map(i => ({
    item_id: i.productId,
    item_name: i.productName,
    item_variant: i.variety,
    price: i.priceKES,
    quantity: i.quantity,
  })),
})

export const trackSignUp = () => send('sign_up', { method: 'phone' })
export const trackLogin  = () => send('login', { method: 'phone' })
