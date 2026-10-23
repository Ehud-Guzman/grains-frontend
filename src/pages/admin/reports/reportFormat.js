import { formatKES } from '../../../utils/helpers'

// Number and label formatting shared by every report.

// Whole shillings. The shop prices and bills in whole shillings, but report totals are sums of VAT-bearing
// order totals and arrive as "88408499.4" or "2754330.72"; shown raw they look like a calculation error next
// to the whole figures beside them. (formatKES itself is left alone: the order and cart screens rely on it.)
export const money = (n) => (n === null || n === undefined || Number.isNaN(Number(n)) ? '—' : formatKES(Math.round(Number(n))))

// Axis ticks: 450, 12K, 3.5M. A chart of millions must not read "12000K".
export const moneyCompact = (v) => {
  const n = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (n >= 1e6) return `${sign}${+(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${sign}${+(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`
  return `${v}`
}

// How a payment method is named on screen. The API sends the raw id ("mpesa", "delivery", "pickup"), where
// "delivery" means cash on delivery and "pickup" means pay when collecting: neither is obvious from the id.
const PAYMENT_LABELS = {
  mpesa: 'M-Pesa',
  delivery: 'Cash on delivery',
  pickup: 'Pay on pickup',
  cash: 'Cash',
  card: 'Card',
  manual: 'Manual',
}
export const paymentLabel = (id) => {
  if (!id) return '—'
  return PAYMENT_LABELS[id] || String(id).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())
}

// 0 -> "12 AM", 9 -> "9 AM", 14 -> "2 PM". Hours come from the API on the Nairobi clock.
export const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`

// Change against the previous period, as a whole percent. null when there is nothing to compare with
// (an older API, or a previous period with no sales: "up infinity %" says nothing).
export const percentChange = (now, before) => {
  if (typeof before !== 'number' || before === 0 || typeof now !== 'number') return null
  const change = ((now - before) / before) * 100
  return Math.sign(change) * Math.round(Math.abs(change))
}

// "Placed", "Out for delivery" etc: statuses are stored as snake_case ids.
export const humanise = (id) => (id ? String(id).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) : '—')
