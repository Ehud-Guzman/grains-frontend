export const ORDER_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PREPARING: 'preparing',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled'
}

export const PAYMENT_METHODS = {
  MPESA: 'mpesa',
  PICKUP: 'pickup',
  DELIVERY: 'delivery'
}

export const DELIVERY_METHODS = {
  PICKUP: 'pickup',
  DELIVERY: 'delivery'
}

export const PACKAGING_SIZES = ['45kg', '50kg', '90kg', '100kg', 'Bulk']

export const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled'
}

export const STATUS_DESCRIPTIONS = {
  pending: 'Your order has been received and is awaiting confirmation.',
  approved: 'Your order has been confirmed and stock has been reserved.',
  preparing: 'Your order is being packed and prepared.',
  out_for_delivery: 'Your order is on its way to you.',
  completed: 'Your order has been delivered. Thank you!',
  rejected: 'Your order was declined.',
  cancelled: 'This order was cancelled.'
}

export const PAYMENT_LABELS = {
  mpesa: 'M-Pesa',
  pickup: 'Pay on Pickup',
  delivery: 'Pay on Delivery'
}

export const DEFAULT_SHOP_INFO = {
  name: 'Vittorios Grains & Cereals',
  tagline: 'Quality grains, delivered fresh',
  phone: '+254 799 031 449',
  email: 'vittoriostrades@gmail.com',
  hours: 'Mon – Sat: 7:00 AM – 7:00 PM',
  location: 'Bungoma, Kenya',
  whatsapp: ''
}

export const SHOP_INFO = DEFAULT_SHOP_INFO
