import { STATUS_LABELS, STATUS_DESCRIPTIONS } from './constants'

// Format KES currency
export const formatKES = (amount) => {
  if (amount === null || amount === undefined) return 'Quote only'
  return `KES ${Number(amount).toLocaleString('en-KE')}`
}

// Format date to human readable
export const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
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
    minute: '2-digit'
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

// Get status label
export const getStatusLabel = (status) => STATUS_LABELS[status] || status

// Get status description
export const getStatusDescription = (status) => STATUS_DESCRIPTIONS[status] || ''

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

// Truncate text
export const truncate = (str, n = 100) => {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

// Get initials from name
export const getInitials = (name = '') => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Validate Kenyan phone number
export const isValidKenyanPhone = (phone) => {
  return /^(\+254|0)[17]\d{8}$/.test(phone)
}
