import { X, Printer, CheckCircle, Phone, Mail, Clock, MapPin } from 'lucide-react'
import { formatKES, formatDate } from '../../utils/helpers'
import { PAYMENT_LABELS } from '../../utils/constants'
import { useShopInfo } from '../../context/AppSettingsContext'

const STATUS_CFG = {
  pending:          { label: 'Pending',          cls: 'bg-amber-50  text-amber-700  border-amber-200'  },
  approved:         { label: 'Approved',         cls: 'bg-blue-50   text-blue-700   border-blue-200'   },
  preparing:        { label: 'Preparing',        cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  out_for_delivery: { label: 'Out for Delivery', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  completed:        { label: 'Completed',        cls: 'bg-green-50  text-green-700  border-green-200'  },
  rejected:         { label: 'Rejected',         cls: 'bg-red-50    text-red-700    border-red-200'    },
  cancelled:        { label: 'Cancelled',        cls: 'bg-earth-50  text-earth-500  border-earth-200'  },
}

export default function Receipt({ order, variant = 'customer', onClose }) {
  const shopInfo = useShopInfo()
  const isAdmin       = variant === 'admin'
  const customerName  = order.userId?.name  || order.guestId?.name  || order.name  || '—'
  const customerPhone = order.userId?.phone || order.guestId?.phone || order.phone || '—'
  const statusCfg     = STATUS_CFG[order.status] || STATUS_CFG.pending

  return (
    <>
      {/* ── SCREEN MODAL ─────────────────────────────────────────── */}
      <div className="no-print fixed inset-0 z-50">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        {/* Sheet */}
    <div className="absolute inset-0 flex items-start justify-center p-4 pointer-events-none">
  <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl
    shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[88vh] pointer-events-auto
    overflow-hidden">

            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-4
              border-b border-earth-100 flex-shrink-0 bg-white">
              <div>
                <p className="font-body font-bold text-earth-900 text-base">
                  {isAdmin ? 'Order Receipt' : 'Your Receipt'}
                </p>
                <p className="text-earth-400 text-xs font-body mt-0.5">{order.orderRef}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-earth-900 text-white
                    rounded-xl text-sm font-body font-semibold hover:bg-earth-800
                    transition-all active:scale-[0.97]">
                  <Printer size={14} /> Print / Save PDF
                </button>
                <button onClick={onClose}
                  className="p-2.5 rounded-xl hover:bg-earth-100 text-earth-400
                    hover:text-earth-700 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="overflow-y-auto flex-1 bg-earth-50">
              <div className="p-4 sm:p-6">
                <ReceiptBody
                  order={order} isAdmin={isAdmin} statusCfg={statusCfg}
                  customerName={customerName} customerPhone={customerPhone}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRINT AREA ───────────────────────────────────────────── */}
      <div className="print-area" style={{ visibility: 'hidden' }}>
        <ReceiptBody
          order={order} isAdmin={isAdmin} statusCfg={statusCfg}
          customerName={customerName} customerPhone={customerPhone}
        />
      </div>
    </>
  )
}

// ── RECEIPT BODY ──────────────────────────────────────────────────────────────
function ReceiptBody({ order, isAdmin, statusCfg, customerName, customerPhone }) {
  const itemCount  = order.orderItems?.length || 0
  const hasDelivery = order.deliveryFee > 0

  return (
    <div className="bg-white font-body" style={{ maxWidth: '600px', margin: '0 auto' }}>

      {/* ── TOP GOLD BAND ─────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #1A1410 0%, #2C1F0E 100%)', padding: '28px 32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>

          {/* Logo + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '12px', overflow: 'hidden',
              border: '2px solid rgba(200,145,42,0.4)', flexShrink: 0 }}>
              <img src="/Vittorios-logo.jpeg" alt="Vittorios"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <p style={{ color: '#FDFAF5', fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 700, fontSize: '20px', lineHeight: 1.2, margin: 0 }}>
                Vittorios
              </p>
              <p style={{ color: 'rgba(200,145,42,0.9)', fontSize: '12px',
                letterSpacing: '0.06em', margin: '3px 0 0', fontWeight: 500 }}>
                Grains &amp; Cereals
              </p>
            </div>
          </div>

          {/* Order ref + date + status */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#FDFAF5', fontWeight: 700, fontSize: '16px',
              letterSpacing: '0.05em', margin: 0 }}>
              {order.orderRef}
            </p>
            <p style={{ color: 'rgba(253,250,245,0.5)', fontSize: '12px', margin: '4px 0 8px' }}>
              {formatDate(order.createdAt)}
            </p>
            <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${statusCfg.cls}`}
              style={{ fontSize: '11px' }}>
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Gold divider */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,145,42,0.6), transparent)',
          marginTop: '20px' }} />

        {/* Receipt label */}
        <p style={{ color: 'rgba(200,145,42,0.7)', fontSize: '10px', letterSpacing: '0.2em',
          textTransform: 'uppercase', margin: '12px 0 0', fontWeight: 600 }}>
          {isAdmin ? 'Tax Invoice / Packing Slip' : 'Order Receipt'}
        </p>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────── */}
      <div style={{ padding: '28px 32px' }}>

        {/* Customer + Order meta — two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>

          {/* Billed to */}
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#9E8E7A',
              letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
              {isAdmin ? 'Customer' : 'Billed To'}
            </p>
            <p style={{ fontWeight: 700, color: '#1C1410', fontSize: '14px', margin: '0 0 3px' }}>
              {customerName}
            </p>
            <p style={{ color: '#6B5E50', fontSize: '13px', margin: '0 0 3px' }}>{customerPhone}</p>
            {order.deliveryAddress && (
              <p style={{ color: '#9E8E7A', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
                {order.deliveryAddress}
              </p>
            )}
          </div>

          {/* Order info */}
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#9E8E7A',
              letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Order Info
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <tbody>
                {[
                  ['Reference',  order.orderRef],
                  ['Date',       formatDate(order.createdAt)],
                  ['Items',      `${itemCount} item${itemCount !== 1 ? 's' : ''}`],
                  ['Delivery',   order.deliveryMethod === 'pickup' ? 'Pickup' : 'Home Delivery'],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ color: '#9E8E7A', paddingBottom: '4px', paddingRight: '12px',
                      whiteSpace: 'nowrap' }}>{label}</td>
                    <td style={{ color: '#1C1410', fontWeight: 600, paddingBottom: '4px' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gold section divider */}
        <div style={{ height: '2px', background: 'linear-gradient(90deg, #C8912A 0%, #E8B84B 50%, #C8912A 100%)',
          borderRadius: '1px', marginBottom: '24px' }} />

        {/* Items table */}
        <div style={{ marginBottom: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #1A1410' }}>
                {['Item', 'Qty', 'Unit Price', 'Total'].map((h, i) => (
                  <th key={h} style={{
                    fontSize: '10px', fontWeight: 700, color: '#1C1410',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    padding: '0 0 10px',
                    textAlign: i === 0 ? 'left' : 'right'
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.orderItems?.map((item, i) => (
                <tr key={i} style={{
                  borderBottom: `1px solid ${i === order.orderItems.length - 1 ? '#1A1410' : '#F0E8D8'}`
                }}>
                  <td style={{ padding: '12px 16px 12px 0' }}>
                    <p style={{ fontWeight: 700, color: '#1C1410', fontSize: '13px', margin: '0 0 2px' }}>
                      {item.productName}
                    </p>
                    <p style={{ color: '#9E8E7A', fontSize: '11px', margin: 0 }}>
                      {item.variety} · {item.packaging}
                    </p>
                  </td>
                  <td style={{ textAlign: 'right', color: '#1C1410', fontSize: '13px',
                    fontWeight: 600, padding: '12px 0', whiteSpace: 'nowrap' }}>
                    {item.quantity}
                  </td>
                  <td style={{ textAlign: 'right', color: '#6B5E50', fontSize: '12px',
                    padding: '12px 0 12px 16px', whiteSpace: 'nowrap' }}>
                    {formatKES(item.unitPrice)}
                  </td>
                  <td style={{ textAlign: 'right', color: '#1C1410', fontWeight: 700,
                    fontSize: '13px', padding: '12px 0 12px 16px', whiteSpace: 'nowrap' }}>
                    {formatKES(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '28px' }}>
          <div style={{ width: '240px' }}>
            {[
              { label: 'Subtotal', value: formatKES(order.subtotal || order.total), bold: false },
              ...(hasDelivery ? [{ label: 'Delivery Fee', value: formatKES(order.deliveryFee), bold: false }] : []),
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between',
                padding: '5px 0', borderBottom: '1px solid #F0E8D8' }}>
                <span style={{ color: '#6B5E50', fontSize: '13px' }}>{row.label}</span>
                <span style={{ color: '#1C1410', fontWeight: 600, fontSize: '13px' }}>{row.value}</span>
              </div>
            ))}
            {/* Total row — gold highlight */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', marginTop: '8px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #1A1410, #2C1F0E)' }}>
              <span style={{ color: 'rgba(253,250,245,0.7)', fontSize: '13px', fontWeight: 600,
                letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Total
              </span>
              <span style={{ color: '#C8912A', fontWeight: 800, fontSize: '18px',
                fontFamily: "'Playfair Display', Georgia, serif" }}>
                {formatKES(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment + Delivery */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
          marginBottom: '24px' }}>
          {[
            {
              title: 'Payment',
              lines: [
                PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod,
                order.paymentStatus === 'paid' ? '✓ Confirmed' : 'Pending',
                ...(isAdmin && order.paymentId?.mpesaTransactionId
                  ? [`Ref: ${order.paymentId.mpesaTransactionId}`] : [])
              ],
              accent: order.paymentStatus === 'paid' ? '#16a34a' : '#d97706'
            },
            {
              title: 'Delivery',
              lines: [
                order.deliveryMethod === 'pickup' ? 'Pickup from Shop' : 'Home Delivery',
                ...(order.deliveryAddress ? [order.deliveryAddress] : [])
              ],
              accent: '#C8912A'
            }
          ].map(col => (
            <div key={col.title} style={{ background: '#FAF7F2', borderRadius: '12px',
              padding: '14px 16px', border: '1px solid #E8DDD0' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#9E8E7A',
                letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                {col.title}
              </p>
              {col.lines.map((line, i) => (
                <p key={i} style={{
                  fontSize: i === 0 ? '13px' : '11px',
                  fontWeight: i === 0 ? 700 : 400,
                  color: i === 1 ? col.accent : i === 0 ? '#1C1410' : '#9E8E7A',
                  margin: i === 0 ? '0 0 3px' : '0',
                  lineHeight: 1.4
                }}>
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>

        {/* Special instructions — admin only */}
        {isAdmin && order.specialInstructions && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A',
            borderRadius: '12px', padding: '14px 16px', marginBottom: '24px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#92400E',
              letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              Special Instructions
            </p>
            <p style={{ color: '#78350F', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
              {order.specialInstructions}
            </p>
          </div>
        )}

        {/* Paid confirmation */}
        {order.paymentStatus === 'paid' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', background: '#F0FDF4', border: '1px solid #BBF7D0',
            borderRadius: '12px', padding: '12px 16px', marginBottom: '24px' }}>
            <CheckCircle size={16} color="#16a34a" />
            <p style={{ color: '#15803D', fontWeight: 700, fontSize: '13px', margin: 0 }}>
              Payment Confirmed
            </p>
          </div>
        )}

        {/* ── FOOTER ────────────────────────────────────────────────── */}
        <div style={{ position: 'relative', paddingTop: '20px' }}>
          {/* Dashed divider */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            backgroundImage: 'repeating-linear-gradient(90deg, #C8912A 0, #C8912A 8px, transparent 8px, transparent 16px)' }} />

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#6B5E50',
            fontWeight: 600, margin: '0 0 14px', fontFamily: "'Playfair Display', Georgia, serif" }}>
            Thank you for shopping with Vittorios!
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { icon: '📞', text: shopInfo.phone },
              { icon: '✉',  text: shopInfo.email },
              { icon: '🕐', text: shopInfo.hours },
              { icon: '📍', text: shopInfo.location },
            ].map(item => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center',
                gap: '6px' }}>
                <span style={{ fontSize: '12px' }}>{item.icon}</span>
                <span style={{ fontSize: '11px', color: '#9E8E7A' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
