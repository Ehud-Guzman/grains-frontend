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

export const STOCK_CONFIG = {
  in:  { dot: 'bg-green-400', text: 'text-green-600', label: 'In Stock',     badge: 'bg-green-50 text-green-700 border-green-200'  },
  low: { dot: 'bg-amber-400', text: 'text-amber-600', label: 'Low Stock',    badge: 'bg-amber-50 text-amber-700 border-amber-200'  },
  out: { dot: 'bg-red-400',   text: 'text-red-500',   label: 'Out of Stock', badge: 'bg-red-50 text-red-600 border-red-200'        },
}

export const ORDER_STATUS_CONFIG = {
  pending:          { dot: 'bg-amber-400',  text: 'text-amber-700',  badge: 'bg-amber-50  border-amber-200',  stripe: 'bg-amber-400',  bg: 'bg-amber-50',  border: 'border-amber-200',  label: 'Pending'         },
  approved:         { dot: 'bg-blue-400',   text: 'text-blue-700',   badge: 'bg-blue-50   border-blue-200',   stripe: 'bg-blue-400',   bg: 'bg-blue-50',   border: 'border-blue-200',   label: 'Approved'        },
  preparing:        { dot: 'bg-purple-400', text: 'text-purple-700', badge: 'bg-purple-50 border-purple-200', stripe: 'bg-purple-400', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Preparing'       },
  out_for_delivery: { dot: 'bg-brand-400',  text: 'text-brand-700',  badge: 'bg-brand-50  border-brand-200',  stripe: 'bg-brand-400',  bg: 'bg-brand-50',  border: 'border-brand-200',  label: 'Out for Delivery' },
  completed:        { dot: 'bg-green-400',  text: 'text-green-700',  badge: 'bg-green-50  border-green-200',  stripe: 'bg-green-400',  bg: 'bg-green-50',  border: 'border-green-200',  label: 'Completed'       },
  rejected:         { dot: 'bg-red-400',    text: 'text-red-700',    badge: 'bg-red-50    border-red-200',    stripe: 'bg-red-400',    bg: 'bg-red-50',    border: 'border-red-200',    label: 'Rejected'        },
  cancelled:        { dot: 'bg-earth-300',  text: 'text-earth-500',  badge: 'bg-earth-50  border-earth-200',  stripe: 'bg-earth-200',  bg: 'bg-earth-50',  border: 'border-earth-200',  label: 'Cancelled'       },
}
