import { useEffect, useRef, useState } from 'react'
import { X, Printer, Download } from 'lucide-react'
import { formatKES, formatDate } from '../../utils/helpers'
import { PAYMENT_LABELS } from '../../utils/constants'
import { useAppSettings } from '../../context/AppSettingsContext'
import { publicSettingsService } from '../../services/admin/settings.service'

const RECEIPT_WIDTH = 700

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
  const { shopInfo } = useAppSettings()
  const isAdmin       = variant === 'admin'
  const [receiptConfig, setReceiptConfig] = useState({ kraPin: '', receiptFooterNote: '', cuSerialNumber: '' })

  useEffect(() => {
    publicSettingsService.getReceiptConfig()
      .then(res => setReceiptConfig(res.data?.data || {}))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const { kraPin, receiptFooterNote, cuSerialNumber } = receiptConfig
  const customerName  = order.userId?.name  || order.guestId?.name  || order.name  || '—'
  const customerPhone = order.userId?.phone || order.guestId?.phone || order.phone || '—'
  const statusCfg     = STATUS_CFG[order.status] || STATUS_CFG.pending
  const pdfCaptureRef = useRef(null)
  const [downloading, setDownloading] = useState(false)

  // PDF capture always renders from a fixed-width offscreen node (pdfCaptureRef),
  // never the on-screen modal preview — that preview shrinks to whatever the
  // viewport happens to be (phone width, a narrow window), which produced
  // cramped, mismatched-proportion PDFs. The offscreen node is a fixed
  // RECEIPT_WIDTH regardless of device, so downloads look the same everywhere.
  const downloadPdf = async () => {
    const el = pdfCaptureRef.current
    if (!el) return
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF }   = await import('jspdf')
      // scale 2 + JPEG keeps this a few hundred KB — PNG at higher scale
      // ballooned to 20MB+ (the embedded logo photo doesn't compress well as PNG).
      const canvas  = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      const pdfW    = 210 // A4 width mm
      const pdfH    = (canvas.height * pdfW) / canvas.width
      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfW, pdfH] })
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH)
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
            <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3.5 sm:py-4
              border-b border-earth-100 flex-shrink-0 bg-white">
              <div className="min-w-0">
                <p className="font-body font-bold text-earth-900 text-sm sm:text-base truncate">
                  {isAdmin ? 'Order Receipt' : 'Your Receipt'}
                </p>
                <p className="text-earth-400 text-xs font-body mt-0.5 truncate">{order.orderRef}</p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  onClick={downloadPdf}
                  disabled={downloading}
                  title="Download PDF"
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-brand-500 text-white
                    rounded-xl text-sm font-body font-semibold hover:bg-brand-600
                    transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed">
                  <Download size={14} />
                  <span className="hidden sm:inline">{downloading ? 'Generating…' : 'Download PDF'}</span>
                </button>
                <button onClick={() => window.print()} title="Print"
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-earth-900 text-white
                    rounded-xl text-sm font-body font-semibold hover:bg-earth-800
                    transition-all active:scale-[0.97]">
                  <Printer size={14} /> <span className="hidden sm:inline">Print</span>
                </button>
                <button onClick={onClose}
                  className="p-2 sm:p-2.5 rounded-xl hover:bg-earth-100 text-earth-400
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
                  shopInfo={shopInfo} kraPin={kraPin} receiptFooterNote={receiptFooterNote}
                  cuSerialNumber={cuSerialNumber}
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
          shopInfo={shopInfo} kraPin={kraPin} receiptFooterNote={receiptFooterNote}
          cuSerialNumber={cuSerialNumber}
        />
      </div>

      {/* ── PDF CAPTURE (offscreen, fixed width) ────────────────────
          Rendered at a constant RECEIPT_WIDTH regardless of the viewer's
          screen size, so "Download PDF" always produces the same
          well-proportioned document instead of whatever width the modal
          happened to be squeezed into on the visitor's device.
          Positioned at 0,0 (not pushed thousands of px offscreen) — html2canvas
          silently drops some content when the captured node sits far outside
          the real viewport's coordinate space. It stays hidden behind the
          modal's own full-screen backdrop instead, via a negative z-index. */}
      <div style={{ position: 'fixed', top: 0, left: 0, zIndex: -1, width: `${RECEIPT_WIDTH}px`, pointerEvents: 'none' }}>
        <div ref={pdfCaptureRef}>
          <ReceiptBody
            order={order} isAdmin={isAdmin} statusCfg={statusCfg}
            customerName={customerName} customerPhone={customerPhone}
            shopInfo={shopInfo} kraPin={kraPin} receiptFooterNote={receiptFooterNote}
            cuSerialNumber={cuSerialNumber}
          />
        </div>
      </div>
    </>
  )
}

// ── RECEIPT BODY ──────────────────────────────────────────────────────────────
function ReceiptBody({ order, isAdmin, statusCfg, customerName, customerPhone, shopInfo, kraPin, receiptFooterNote, cuSerialNumber }) {
  const itemCount   = order.orderItems?.length || 0
  const hasDelivery = order.deliveryFee > 0
  const hasVat      = order.vatEnabled && order.vatAmount > 0
  const hasDiscount = order.couponDiscount > 0
  const invoiceNumber = order.etimsInvoiceNumber || order.orderRef
  const etimsConfirmed = order.etimsStatus === 'submitted' && order.etimsControlNumber

  return (
    <div className="bg-white font-body" style={{ maxWidth: '680px', margin: '0 auto',
      border: '1px solid #EAE3D8', borderRadius: '16px', overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 12px 28px rgba(17,24,39,0.05)' }}>

      {/* ── HEADER ────────────────────────────────────────────────── */}
      {/* Earth accent stripe */}
      <div style={{ height: '5px', background: 'linear-gradient(90deg, #833D19 0%, #C4622D 50%, #833D19 100%)' }} />

      <div className="px-5 sm:px-10" style={{ background: '#FFFFFF', paddingTop: '30px', paddingBottom: '22px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>

          {/* Logo + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', overflow: 'hidden',
              border: '1.5px solid #E5E7EB', flexShrink: 0 }}>
              <img src="/Vittorios-logo.jpeg" alt="Vittorios"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <p style={{ color: '#111827', fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 700, fontSize: '23px', lineHeight: 1.2, margin: 0 }}>
                Vittorios
              </p>
              <p style={{ color: '#C4622D', fontSize: '12px',
                letterSpacing: '0.08em', margin: '4px 0 0', fontWeight: 600, textTransform: 'uppercase' }}>
                Grains &amp; Cereals
              </p>
            </div>
          </div>

          {/* Order ref + date + status */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#111827', fontWeight: 700, fontSize: '17px',
              letterSpacing: '0.04em', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
              {order.orderRef}
            </p>
            <p style={{ color: '#9CA3AF', fontSize: '12px', margin: '5px 0 10px' }}>
              {formatDate(order.createdAt)}
            </p>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${statusCfg.cls}`}
              style={{ fontSize: '11px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Receipt label + KRA PINs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px' }}>
          <p style={{ color: '#833D19', fontSize: '10.5px', letterSpacing: '0.22em',
            textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>
            Tax Invoice
          </p>
          <div style={{ textAlign: 'right' }}>
            {kraPin && (
              <p style={{ color: '#4B5563', fontSize: '10px', letterSpacing: '0.12em',
                margin: 0, fontFamily: 'monospace', fontWeight: 600 }}>
                Seller PIN: {kraPin}
              </p>
            )}
            {order.buyerKraPin && (
              <p style={{ color: '#4B5563', fontSize: '10px', letterSpacing: '0.12em',
                margin: '2px 0 0', fontFamily: 'monospace', fontWeight: 600 }}>
                Buyer PIN: {order.buyerKraPin}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────── */}
      <div className="px-5 sm:px-10" style={{ paddingTop: '28px', paddingBottom: '28px' }}>

        {/* Customer + Order meta — 2 columns from RECEIPT_WIDTH/print up, stacks on a narrow on-screen phone modal */}
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '20px 24px', marginBottom: '26px' }}>
          <div>
            <p style={{ fontSize: '9px', fontWeight: 700, color: '#9CA3AF',
              letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '9px' }}>
              {isAdmin ? 'Customer' : 'Billed To'}
            </p>
            <p style={{ fontWeight: 700, color: '#111827', fontSize: '13.5px', margin: '0 0 3px' }}>
              {customerName}
            </p>
            <p style={{ color: '#4B5563', fontSize: '12px', margin: '0 0 3px' }}>{customerPhone}</p>
            {order.deliveryAddress && (
              <p style={{ color: '#6B7280', fontSize: '11px', lineHeight: 1.5, margin: 0 }}>
                {order.deliveryAddress}
              </p>
            )}
          </div>
          <div>
            <p style={{ fontSize: '9px', fontWeight: 700, color: '#9CA3AF',
              letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '9px' }}>
              Order Info
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <tbody>
                {[
                  ['Invoice No.', invoiceNumber],
                  ['Reference', order.orderRef],
                  ['Date',      formatDate(order.createdAt)],
                  ['Items',     `${itemCount} item${itemCount !== 1 ? 's' : ''}`],
                  ['Delivery',  order.deliveryMethod === 'pickup' ? 'Pickup' : 'Home Delivery'],
                  ...(order.preferredDeliveryDate
                    ? [['Requested', formatDate(order.preferredDeliveryDate)]]
                    : []),
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ color: '#6B7280', paddingBottom: '4px', paddingRight: '12px', whiteSpace: 'nowrap' }}>{label}</td>
                    <td style={{ color: '#111827', fontWeight: 600, paddingBottom: '4px', textAlign: 'right' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Items table — overflow-x is a safety net for very narrow phones; not
            forced via minWidth, so it doesn't regress the already-narrow on-screen
            modal preview (capped at sm:max-w-lg regardless of device). */}
        <div style={{ overflowX: 'auto', marginBottom: '22px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Item', 'Qty', 'Unit Price', 'Total'].map((h, i) => (
                <th key={h} style={{
                  fontSize: '9px', fontWeight: 700, color: '#833D19',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  padding: '9px 0', background: '#FBF8F3',
                  borderTop: '1px solid #EFE7D8', borderBottom: '1px solid #EFE7D8',
                  textAlign: i === 0 ? 'left' : 'right',
                  paddingLeft: i === 0 ? '12px' : 0,
                  paddingRight: i === 3 ? '12px' : 0,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.orderItems?.map((item, i, arr) => (
              <tr key={i} style={{ borderBottom: i === arr.length - 1 ? 'none' : '1px solid #F3F4F6' }}>
                <td style={{ padding: '12px 16px 12px 12px' }}>
                  <p style={{ fontWeight: 600, color: '#111827', fontSize: '13px', margin: '0 0 1px' }}>
                    {item.productName}
                  </p>
                  <p style={{ color: '#6B7280', fontSize: '11px', margin: 0 }}>
                    {item.variety} · {item.packaging}
                  </p>
                </td>
                <td style={{ textAlign: 'right', color: '#111827', fontSize: '13px',
                  fontWeight: 600, padding: '12px 0', whiteSpace: 'nowrap' }}>
                  {item.quantity}
                </td>
                <td style={{ textAlign: 'right', color: '#4B5563', fontSize: '12px',
                  padding: '12px 0 12px 16px', whiteSpace: 'nowrap' }}>
                  {formatKES(item.unitPrice)}
                </td>
                <td style={{ textAlign: 'right', color: '#111827', fontWeight: 600,
                  fontSize: '13px', padding: '12px 12px 12px 16px', whiteSpace: 'nowrap' }}>
                  {formatKES(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* Totals — tinted summary panel */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '26px' }}>
          <div style={{ width: '270px', background: '#FBF8F3', border: '1px solid #EFE7D8',
            borderRadius: '10px', padding: '14px 18px' }}>
            {[
              { label: 'Subtotal',                                                           value: formatKES(order.subtotal || order.total) },
              ...(hasVat      ? [{ label: `VAT (${order.vatRate}%)`,                          value: formatKES(order.vatAmount) }] : []),
              ...(hasDelivery ? [{ label: 'Delivery Fee',                                     value: formatKES(order.deliveryFee) }] : []),
              ...(hasDiscount ? [{ label: `Discount (${order.couponCode})`, isDiscount: true, value: `−${formatKES(order.couponDiscount)}` }] : []),
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ color: row.isDiscount ? '#16a34a' : '#6B7280', fontSize: '12px' }}>{row.label}</span>
                <span style={{ color: row.isDiscount ? '#16a34a' : '#111827', fontSize: '12px' }}>{row.value}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #E4D9C4', marginTop: '8px', paddingTop: '10px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: '#833D19', fontSize: '11px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Total Due
              </span>
              <span style={{ color: '#111827', fontWeight: 800, fontSize: '18px',
                fontFamily: "'Playfair Display', Georgia, serif" }}>
                {formatKES(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment + Delivery — bordered summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ marginBottom: '18px', gap: '14px' }}>
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
            <div key={col.title} style={{ border: '1px solid #F3F4F6', borderRadius: '10px', padding: '12px 14px' }}>
              <p style={{ fontSize: '9px', fontWeight: 700, color: '#9CA3AF',
                letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                {col.title}
              </p>
              {col.lines.map((line, i) => (
                <p key={i} style={{
                  fontSize: '12px',
                  fontWeight: i === 0 ? 600 : 400,
                  color: (i === 1 && col.paidLine) ? '#16a34a' : i === 0 ? '#111827' : '#6B7280',
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
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '12px', marginBottom: '12px' }}>
            <p style={{ fontSize: '9px', fontWeight: 700, color: '#9CA3AF',
              letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 4px' }}>
              Special Instructions
            </p>
            <p style={{ color: '#4B5563', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
              {order.specialInstructions}
            </p>
          </div>
        )}

        {/* Paid stamp — deliberately not display:'inline-flex'. html2canvas
            (used for PDF export) silently drops this element's children when
            the container is a flex box, even though the identical-looking
            status badge above (a Tailwind flex pill) captures fine — narrowed
            down by bisecting against a raw canvas dump. inline-block + margin
            sidesteps it; also avoids the lucide-react CheckCircle icon, which
            html2canvas rasterizes unreliably. */}
        {order.paymentStatus === 'paid' && (
          <span style={{ display: 'inline-block',
            background: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: '999px',
            padding: '5px 12px' }}>
            <span style={{ color: '#16a34a', fontSize: '13px', fontWeight: 700, marginRight: '6px' }}>✓</span>
            <span style={{ color: '#15803D', fontWeight: 600, fontSize: '12px' }}>
              Payment confirmed
            </span>
          </span>
        )}
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <div className="px-5 sm:px-10" style={{ position: 'relative', background: '#FBF8F3', paddingTop: '22px', paddingBottom: '26px' }}>
        {/* Accent divider */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, #E4D9C4 15%, #E4D9C4 85%, transparent 100%)' }} />

        <p style={{ textAlign: 'center', fontSize: '13.5px', color: '#374151',
          fontWeight: 600, margin: '4px 0 16px', fontFamily: "'Playfair Display', Georgia, serif" }}>
          {receiptFooterNote || 'Thank you for shopping with us!'}
        </p>

        {/* Contact grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '7px 16px', marginBottom: kraPin ? '16px' : '0' }}>
          {[
            shopInfo.phone    && { label: 'Tel',      value: shopInfo.phone    },
            shopInfo.email    && { label: 'Email',    value: shopInfo.email    },
            shopInfo.hours    && { label: 'Hours',    value: shopInfo.hours    },
            shopInfo.location && { label: 'Location', value: shopInfo.location },
          ].filter(Boolean).map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#833D19',
                letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>
                {item.label}
              </span>
              <span style={{ fontSize: '11px', color: '#6B7280', lineHeight: 1.4 }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* KRA PIN — compliance footer */}
        {kraPin && (
          <div style={{ marginTop: '14px', borderTop: '1px solid #EFE7D8', paddingTop: '12px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#6B7280',
              letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              KRA PIN
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700,
              color: '#111827', letterSpacing: '0.08em' }}>
              {kraPin}
            </span>
          </div>
        )}

        {/* eTIMS fiscal zone — CU serial + QR placeholder (real QR embeds once KRA OSCU credentials go live) */}
        {kraPin && (
          <div style={{ marginTop: '12px', borderTop: '1px dashed #E4D9C4', paddingTop: '12px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '9px', fontWeight: 700, color: '#6B7280',
                letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 3px' }}>
                CU Serial No.
              </p>
              <p style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, color: '#111827', margin: 0 }}>
                {cuSerialNumber || 'Pending eTIMS setup'}
              </p>
              {etimsConfirmed && (
                <p style={{ fontSize: '10px', fontFamily: 'monospace', color: '#4B5563', margin: '4px 0 0' }}>
                  Control No. {order.etimsControlNumber}
                </p>
              )}
            </div>
            <div style={{
              width: '54px', height: '54px', border: '1.5px dashed #D8CDB8', borderRadius: '8px',
              background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: '7px', fontWeight: 700, color: '#9CA3AF',
                letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.3 }}>
                eTIMS<br />QR
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
