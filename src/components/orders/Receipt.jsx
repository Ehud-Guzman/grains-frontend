import { useRef, useState } from 'react'
import { X, Printer, CheckCircle, Download } from 'lucide-react'
import { formatKES, formatDate } from '../../utils/helpers'
import { PAYMENT_LABELS } from '../../utils/constants'
import { useAppSettings } from '../../context/AppSettingsContext'

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
  const { shopInfo, kraPin, receiptFooterNote } = useAppSettings()
  const isAdmin       = variant === 'admin'
  const customerName  = order.userId?.name  || order.guestId?.name  || order.name  || '—'
  const customerPhone = order.userId?.phone || order.guestId?.phone || order.phone || '—'
  const statusCfg     = STATUS_CFG[order.status] || STATUS_CFG.pending
  const receiptRef    = useRef(null)
  const [downloading, setDownloading] = useState(false)

  const downloadPdf = async () => {
    const el = receiptRef.current
    if (!el) return
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF }   = await import('jspdf')
      const canvas  = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
      const imgData = canvas.toDataURL('image/png')
      const pdfW    = 210 // A4 width mm
      const pdfH    = (canvas.height * pdfW) / canvas.width
      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfW, pdfH] })
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH)
      pdf.save(`receipt-${order.orderRef}.pdf`)
    } catch {
      // silent — print fallback still available
    } finally {
      setDownloading(false)
    }
  }

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
                <button
                  onClick={downloadPdf}
                  disabled={downloading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white
                    rounded-xl text-sm font-body font-semibold hover:bg-brand-600
                    transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed">
                  <Download size={14} />
                  {downloading ? 'Generating…' : 'Download PDF'}
                </button>
                <button onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-earth-900 text-white
                    rounded-xl text-sm font-body font-semibold hover:bg-earth-800
                    transition-all active:scale-[0.97]">
                  <Printer size={14} /> Print
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
                <div ref={receiptRef}>
                  <ReceiptBody
                    order={order} isAdmin={isAdmin} statusCfg={statusCfg}
                    customerName={customerName} customerPhone={customerPhone}
                    shopInfo={shopInfo} kraPin={kraPin} receiptFooterNote={receiptFooterNote}
                  />
                </div>
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
          shopInfo={shopInfo} kraPin={kraPin} receiptFooterNote={receiptFooterNote}
        />
      </div>
    </>
  )
}

// ── RECEIPT BODY ──────────────────────────────────────────────────────────────
function ReceiptBody({ order, isAdmin, statusCfg, customerName, customerPhone, shopInfo, kraPin, receiptFooterNote }) {
  const itemCount   = order.orderItems?.length || 0
  const hasDelivery = order.deliveryFee > 0
  const hasVat      = order.vatEnabled && order.vatAmount > 0

  return (
    <div className="bg-white font-body" style={{ maxWidth: '600px', margin: '0 auto' }}>

      {/* ── HEADER ────────────────────────────────────────────────── */}
      {/* Gold accent stripe */}
      <div style={{ height: '4px', background: 'linear-gradient(90deg, #C8912A 0%, #E8B84B 50%, #C8912A 100%)' }} />

      <div style={{ background: '#FFFFFF', padding: '24px 32px 20px', borderBottom: '1px solid #E8DDD0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>

          {/* Logo + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '12px', overflow: 'hidden',
              border: '1.5px solid #DDD0BA', flexShrink: 0 }}>
              <img src="/Vittorios-logo.jpeg" alt="Vittorios"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <p style={{ color: '#1C1410', fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 700, fontSize: '20px', lineHeight: 1.2, margin: 0 }}>
                Vittorios
              </p>
              <p style={{ color: '#C8912A', fontSize: '12px',
                letterSpacing: '0.06em', margin: '3px 0 0', fontWeight: 600 }}>
                Grains &amp; Cereals
              </p>
            </div>
          </div>

          {/* Order ref + date + status */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#1C1410', fontWeight: 700, fontSize: '16px',
              letterSpacing: '0.05em', margin: 0 }}>
              {order.orderRef}
            </p>
            <p style={{ color: '#9E8E7A', fontSize: '12px', margin: '4px 0 8px' }}>
              {formatDate(order.createdAt)}
            </p>
            <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${statusCfg.cls}`}
              style={{ fontSize: '11px' }}>
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Receipt label + KRA PIN */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
          <p style={{ color: '#C8912A', fontSize: '10px', letterSpacing: '0.2em',
            textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>
            TAX INVOICE
          </p>
          {kraPin && (
            <p style={{ color: '#6B5E50', fontSize: '10px', letterSpacing: '0.12em',
              margin: 0, fontFamily: 'monospace', fontWeight: 600 }}>
              KRA PIN: {kraPin}
            </p>
          )}
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 32px' }}>

        {/* Customer + Order meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div>
            <p style={{ fontSize: '9px', fontWeight: 700, color: '#B0A090',
              letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
              {isAdmin ? 'Customer' : 'Billed To'}
            </p>
            <p style={{ fontWeight: 700, color: '#1C1410', fontSize: '13px', margin: '0 0 2px' }}>
              {customerName}
            </p>
            <p style={{ color: '#6B5E50', fontSize: '12px', margin: '0 0 2px' }}>{customerPhone}</p>
            {order.deliveryAddress && (
              <p style={{ color: '#9E8E7A', fontSize: '11px', lineHeight: 1.5, margin: 0 }}>
                {order.deliveryAddress}
              </p>
            )}
          </div>
          <div>
            <p style={{ fontSize: '9px', fontWeight: 700, color: '#B0A090',
              letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Order Info
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <tbody>
                {[
                  ['Reference', order.orderRef],
                  ['Date',      formatDate(order.createdAt)],
                  ['Items',     `${itemCount} item${itemCount !== 1 ? 's' : ''}`],
                  ['Delivery',  order.deliveryMethod === 'pickup' ? 'Pickup' : 'Home Delivery'],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ color: '#9E8E7A', paddingBottom: '3px', paddingRight: '12px', whiteSpace: 'nowrap' }}>{label}</td>
                    <td style={{ color: '#1C1410', fontWeight: 600, paddingBottom: '3px' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section rule */}
        <div style={{ borderTop: '1px solid #E8DDD0', marginBottom: '20px' }} />

        {/* Items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #D0C4B0' }}>
              {['Item', 'Qty', 'Unit Price', 'Total'].map((h, i) => (
                <th key={h} style={{
                  fontSize: '9px', fontWeight: 700, color: '#9E8E7A',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  padding: '0 0 8px', textAlign: i === 0 ? 'left' : 'right'
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.orderItems?.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F0EBE0' }}>
                <td style={{ padding: '10px 16px 10px 0' }}>
                  <p style={{ fontWeight: 600, color: '#1C1410', fontSize: '13px', margin: '0 0 1px' }}>
                    {item.productName}
                  </p>
                  <p style={{ color: '#9E8E7A', fontSize: '11px', margin: 0 }}>
                    {item.variety} · {item.packaging}
                  </p>
                </td>
                <td style={{ textAlign: 'right', color: '#1C1410', fontSize: '13px',
                  fontWeight: 600, padding: '10px 0', whiteSpace: 'nowrap' }}>
                  {item.quantity}
                </td>
                <td style={{ textAlign: 'right', color: '#6B5E50', fontSize: '12px',
                  padding: '10px 0 10px 16px', whiteSpace: 'nowrap' }}>
                  {formatKES(item.unitPrice)}
                </td>
                <td style={{ textAlign: 'right', color: '#1C1410', fontWeight: 600,
                  fontSize: '13px', padding: '10px 0 10px 16px', whiteSpace: 'nowrap' }}>
                  {formatKES(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals — right-aligned, plain lines */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <div style={{ width: '240px' }}>
            {[
              { label: 'Subtotal',                                     value: formatKES(order.subtotal || order.total) },
              ...(hasVat      ? [{ label: `VAT (${order.vatRate}%)`,   value: formatKES(order.vatAmount) }] : []),
              ...(hasDelivery ? [{ label: 'Delivery Fee',              value: formatKES(order.deliveryFee) }] : []),
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#9E8E7A', fontSize: '12px' }}>{row.label}</span>
                <span style={{ color: '#1C1410', fontSize: '12px' }}>{row.value}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #1C1410', marginTop: '6px', paddingTop: '8px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: '#1C1410', fontSize: '11px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Total Amount Due
              </span>
              <span style={{ color: '#1C1410', fontWeight: 800, fontSize: '16px',
                fontFamily: "'Playfair Display', Georgia, serif" }}>
                {formatKES(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment + Delivery — inline table, no cards */}
        <div style={{ borderTop: '1px solid #E8DDD0', paddingTop: '16px', marginBottom: '16px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            {
              title: 'Payment',
              lines: [
                PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod,
                order.paymentStatus === 'paid' ? 'Confirmed' : 'Pending',
                ...(isAdmin && order.paymentId?.mpesaTransactionId
                  ? [`Ref: ${order.paymentId.mpesaTransactionId}`] : [])
              ],
              paidLine: order.paymentStatus === 'paid'
            },
            {
              title: 'Delivery',
              lines: [
                order.deliveryMethod === 'pickup' ? 'Pickup from Shop' : 'Home Delivery',
                ...(order.deliveryAddress ? [order.deliveryAddress] : [])
              ],
              paidLine: false
            }
          ].map(col => (
            <div key={col.title}>
              <p style={{ fontSize: '9px', fontWeight: 700, color: '#B0A090',
                letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                {col.title}
              </p>
              {col.lines.map((line, i) => (
                <p key={i} style={{
                  fontSize: '12px',
                  fontWeight: i === 0 ? 600 : 400,
                  color: (i === 1 && col.paidLine) ? '#16a34a' : i === 0 ? '#1C1410' : '#9E8E7A',
                  margin: '0 0 2px', lineHeight: 1.4
                }}>
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>

        {/* Special instructions — admin only */}
        {isAdmin && order.specialInstructions && (
          <div style={{ borderTop: '1px solid #E8DDD0', paddingTop: '12px', marginBottom: '12px' }}>
            <p style={{ fontSize: '9px', fontWeight: 700, color: '#B0A090',
              letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 4px' }}>
              Special Instructions
            </p>
            <p style={{ color: '#6B5E50', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
              {order.specialInstructions}
            </p>
          </div>
        )}

        {/* Paid stamp */}
        {order.paymentStatus === 'paid' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
            <CheckCircle size={13} color="#16a34a" />
            <p style={{ color: '#15803D', fontWeight: 600, fontSize: '12px', margin: 0 }}>
              Payment confirmed
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
            {receiptFooterNote || 'Thank you for shopping with us!'}
          </p>

          {/* Contact grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginBottom: kraPin ? '14px' : '0' }}>
            {[
              shopInfo.phone    && { label: 'Tel',      value: shopInfo.phone    },
              shopInfo.email    && { label: 'Email',    value: shopInfo.email    },
              shopInfo.hours    && { label: 'Hours',    value: shopInfo.hours    },
              shopInfo.location && { label: 'Location', value: shopInfo.location },
            ].filter(Boolean).map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#C8912A',
                  letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>
                  {item.label}
                </span>
                <span style={{ fontSize: '11px', color: '#9E8E7A', lineHeight: 1.4 }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* KRA PIN — compliance footer */}
          {kraPin && (
            <div style={{ marginTop: '12px', borderTop: '1px solid #F0E8D8', paddingTop: '10px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#9E8E7A',
                letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                KRA PIN
              </span>
              <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700,
                color: '#1C1410', letterSpacing: '0.08em' }}>
                {kraPin}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
