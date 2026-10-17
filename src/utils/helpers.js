import { STATUS_LABELS, STATUS_DESCRIPTIONS } from './constants'

// Format KES currency
export const formatKES = (amount) => {
  if (amount === null || amount === undefined) return 'Quote only'
  return `KES ${Number(amount).toLocaleString('en-KE')}`
}

// Format date to human readable.
// timeZone is pinned to EAT — the backend stores UTC and the business runs on
// Nairobi time, so dates must not shift with the viewer's device timezone.
export const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Nairobi'
  })
}

// Format date with time
export const formatDateTime = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi'
  })
}

// Time ago (e.g. "2 hours ago")
export const timeAgo = (date) => {
  if (!date) return '—'
  const now = new Date()
  const d = new Date(date)
  const diff = Math.floor((now - d) / 1000)

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
  return formatDate(date)
}

// Get status label. Pass the order's deliveryMethod where available — pickup
// orders travel through the same out_for_delivery status as delivery orders,
// but showing "Out for Delivery" for goods the customer must collect is wrong.
export const getStatusLabel = (status, deliveryMethod) =>
  status === 'out_for_delivery' && deliveryMethod === 'pickup'
    ? 'Ready for Pickup'
    : STATUS_LABELS[status] || status

// Get status description
export const getStatusDescription = (status, deliveryMethod) =>
  status === 'out_for_delivery' && deliveryMethod === 'pickup'
    ? 'Your order is packed and ready — come and collect it from the shop.'
    : STATUS_DESCRIPTIONS[status] || ''

// Get status badge class
export const getStatusBadgeClass = (status) => {
  const map = {
    pending: 'badge-pending',
    approved: 'badge-approved',
    preparing: 'badge-preparing',
    out_for_delivery: 'badge-delivery',
    completed: 'badge-completed',
    rejected: 'badge-rejected',
    cancelled: 'badge-cancelled'
  }
  return map[status] || 'badge-pending'
}

// Get stock status
export const getStockStatus = (stock, threshold) => {
  if (!stock || stock === 0) return 'out'
  if (stock <= threshold) return 'low'
  return 'in'
}

// Get stock badge class
export const getStockBadgeClass = (status) => {
  const map = { in: 'stock-in', low: 'stock-low', out: 'stock-out' }
  return map[status] || 'stock-out'
}

// Get stock label
export const getStockLabel = (status) => {
  const map = { in: 'In Stock', low: 'Low Stock', out: 'Out of Stock' }
  return map[status] || 'Out of Stock'
}

// Get price range for a product (min to max across all varieties/packaging)
export const getPriceRange = (product) => {
  const prices = []
  product.varieties?.forEach(v => {
    v.packaging?.forEach(p => {
      if (p.priceKES && !p.quoteOnly) prices.push(p.priceKES)
    })
  })
  if (prices.length === 0) return 'Quote only'
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  if (min === max) return formatKES(min)
  return `${formatKES(min)} – ${formatKES(max)}`
}

// "50kg" → 50. Null for sizes that are not a plain weight ("Bulk", "1 bag"...).
export const parseKg = (size) => {
  const m = /^\s*(\d+(?:\.\d+)?)\s*kg\s*$/i.exec(size || '')
  return m ? Number(m[1]) : null
}

// Price per kilo for a packaging, or null when it has no weight or no fixed price. Wholesale
// buyers compare pack sizes by this number, not by the sticker price.
export const pricePerKg = (pkg) => {
  const kg = parseKg(pkg?.size)
  if (!kg || !pkg?.priceKES || pkg.quoteOnly) return null
  return Math.round((pkg.priceKES / kg) * 100) / 100
}

// Catalogue-card price line. A range like "KES 49 – KES 2,160" (a 1kg pack to a 100kg pack)
// tells a buyer nothing, so show the cheapest price per kilo when every pack is a weight,
// otherwise the lowest pack price.
export const getFromPrice = (product) => {
  const priced = []
  product.varieties?.forEach(v => v.packaging?.forEach(p => {
    if (p.priceKES && !p.quoteOnly) priced.push(p)
  }))
  if (priced.length === 0) return 'Quote only'
  const perKg = priced.map(pricePerKg)
  if (perKg.every(n => n !== null)) return `From ${formatKES(Math.min(...perKg))} / kg`
  return `From ${formatKES(Math.min(...priced.map(p => p.priceKES)))}`
}

// Truncate text
export const truncate = (str, n = 100) => {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

// Get initials from name
export const getInitials = (name = '') => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Strip spaces, dashes and parentheses so "0712 345 678" (the format our own
// placeholders show) validates and submits cleanly.
export const normalizeKenyanPhone = (phone) => {
  return (phone || '').replace(/[\s\-()]/g, '')
}

// Validate Kenyan phone number (accepts spaced/dashed input)
export const isValidKenyanPhone = (phone) => {
  return /^(\+254|0)[17]\d{8}$/.test(normalizeKenyanPhone(phone))
}

// Effective unit price for a cart item, honouring volume pricing tiers so the
// cart/checkout totals match what the backend will actually charge.
// The next volume tier above the current quantity, if buying more would lower the unit price.
// Returns { moreQty, minQty, unitPrice, saving } where saving compares buying minQty at the price
// the customer pays now against buying it at the tier price.
export const nextTierNudge = (item) => {
  const tiers = item.pricingTiers || []
  const current = getCartUnitPrice(item)
  const next = [...tiers]
    .filter(t => t.minQty > item.quantity && t.priceKES < current)
    .sort((a, b) => a.minQty - b.minQty)[0]
  if (!next) return null
  return {
    moreQty: next.minQty - item.quantity,
    minQty: next.minQty,
    unitPrice: next.priceKES,
    saving: Math.round((current - next.priceKES) * next.minQty),
  }
}

// True when any sellable pack of the product has volume pricing — drives the "bulk discount" badge.
export const hasVolumePricing = (product) =>
  !!product?.varieties?.some(v => v.packaging?.some(p => !p.quoteOnly && p.pricingTiers?.length > 0))

export const getCartUnitPrice = (item) => {
  const tiers = item.pricingTiers || []
  if (tiers.length === 0) return item.priceKES
  const active = [...tiers]
    .sort((a, b) => b.minQty - a.minQty)
    .find(t => item.quantity >= t.minQty)
  return active ? active.priceKES : item.priceKES
}
