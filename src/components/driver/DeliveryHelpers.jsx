import { Banknote, CheckCircle, Navigation, AlertTriangle } from 'lucide-react'
import { formatKES } from '../../utils/helpers'

// What the rider must do about money at the door. The driver screens showed the order total
// but never said whether to collect it: a pay-on-delivery order and an already-paid M-Pesa
// order looked identical.
export function CollectionBanner({ order }) {
  if (order.paymentStatus === 'paid') {
    return (
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-800" data-testid="collect-paid">
        <CheckCircle size={15} className="flex-shrink-0" aria-hidden="true" />
        <span className="text-sm font-admin font-semibold">Already paid — do not collect cash</span>
      </div>
    )
  }
  if (order.paymentMethod === 'delivery') {
    return (
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900" data-testid="collect-cash">
        <Banknote size={17} className="flex-shrink-0" aria-hidden="true" />
        <span className="text-sm font-admin font-bold">Collect {formatKES(order.total)} cash on delivery</span>
      </div>
    )
  }
  if (order.paymentMethod === 'pickup' || order.paymentMethod === 'mpesa') {
    return (
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800" data-testid="collect-unpaid">
        <AlertTriangle size={15} className="flex-shrink-0" aria-hidden="true" />
        <span className="text-sm font-admin font-semibold">Not marked paid — call the office before handing over</span>
      </div>
    )
  }
  return null
}

// Opens the rider's maps app: exact coordinates when the customer shared their location at
// checkout, otherwise a search for the typed address.
export function NavigateLink({ order }) {
  const lat = order.deliveryCoordinates?.lat
  const lng = order.deliveryCoordinates?.lng
  const hasCoords = typeof lat === 'number' && typeof lng === 'number'
  if (!hasCoords && !order.deliveryAddress) return null
  const href = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-admin font-semibold hover:bg-blue-100 transition-colors">
      <Navigation size={14} aria-hidden="true" /> {hasCoords ? 'Navigate (exact pin)' : 'Open in Maps'}
    </a>
  )
}
