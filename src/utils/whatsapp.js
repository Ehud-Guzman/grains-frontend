// WhatsApp click-to-chat (wa.me) links. Nothing here sends a message by itself: it opens WhatsApp with
// the text filled in and the person taps Send. That needs no provider account or template approval,
// which is why it works today while SMS is still on a sandbox.

// Kenyan numbers arrive as 0712..., 712..., +254712... or 254712...; wa.me wants digits with country code.
export const toWaNumber = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('254') && digits.length === 12) return digits
  if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`
  if (digits.length === 9 && /^[17]/.test(digits)) return `254${digits}`
  return digits.length >= 9 ? digits : ''
}

export const waLink = (phone, text = '') => {
  const number = toWaNumber(phone)
  if (!number) return null
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

const kes = (n) => `KES ${Number(n || 0).toLocaleString('en-KE')}`

// Customer → shop, from the confirmation / tracking pages.
export const shopOrderMessage = ({ ref, total, name } = {}) =>
  `Hello${name ? `, I'm ${name}` : ''}. I placed order ${ref}${total ? ` (${kes(total)})` : ''}. Please confirm it. Thank you!`

// Shop → customer, worded for where the order actually is.
export const customerStatusMessage = (order, shopName = 'Vittorios Grains & Cereals') => {
  const name = order?.userId?.name || order?.guestId?.name || ''
  const hi = `Hello${name ? ` ${name.split(' ')[0]}` : ''}, this is ${shopName}.`
  const ref = order?.orderRef
  const pickup = order?.deliveryMethod === 'pickup'
  switch (order?.status) {
    case 'pending':
      return `${hi} We received your order ${ref} (${kes(order.total)}) and are checking it now.`
    case 'approved':
    case 'preparing':
      return `${hi} Your order ${ref} is confirmed and we are preparing it.`
    case 'out_for_delivery':
      return pickup
        ? `${hi} Your order ${ref} is ready for collection. Please bring this reference.`
        : `${hi} Your order ${ref} is on its way. Please keep your phone close.`
    case 'completed':
      return `${hi} Thank you for shopping with us. Order ${ref} is complete.`
    default:
      return `${hi} About your order ${ref}:`
  }
}

// Driver → customer, when arriving.
export const driverArrivalMessage = (order, driverName = '') =>
  `Hello, this is ${driverName || 'your driver'} delivering order ${order?.orderRef}. I am nearby. Please be reachable.`
