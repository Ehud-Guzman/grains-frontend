import { formatKES } from '../../utils/helpers'

// Subtotal → delivery → VAT → discount, so the lines a customer sees add up to the amount
// they are asked to pay. Rows with nothing to show are omitted, and a plain order (one
// line, no extras) shows nothing extra at all.
export default function OrderTotals({ order, className = '' }) {
  const discount = Number(order.couponDiscount) || 0
  const rounding = Number(order.roundingAdjustment) || 0
  const rows = [
    { label: 'Subtotal', value: formatKES(order.subtotal), show: order.subtotal != null },
    { label: 'Delivery', value: formatKES(order.deliveryFee), show: Number(order.deliveryFee) > 0 },
    { label: `VAT${order.vatRate ? ` (${order.vatRate}%)` : ''}`, value: formatKES(order.vatAmount), show: Boolean(order.vatEnabled) && Number(order.vatAmount) > 0 },
    { label: `Discount${order.couponCode ? ` (${order.couponCode})` : ''}`, value: `−${formatKES(discount)}`, show: discount > 0, tone: 'text-green-600' },
    { label: 'Rounding', value: `+${formatKES(rounding)}`, show: rounding > 0 },
  ].filter(r => r.show)

  if (rows.length < 2) return null

  return (
    <dl className={`px-5 py-3 space-y-1.5 border-t border-earth-50 ${className}`} data-testid="order-totals">
      {rows.map(r => (
        <div key={r.label} className="flex justify-between text-sm font-body">
          <dt className="text-earth-600">{r.label}</dt>
          <dd className={r.tone || 'text-earth-800'}>{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}
