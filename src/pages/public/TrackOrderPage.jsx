import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Phone, Package, CheckCircle, Clock, XCircle, Truck, ChevronRight } from 'lucide-react'
import { orderService } from '../../services/order.service'
import { OrderStatusTimeline } from '../../components/orders/OrderStatusTimeline'
import { useShopInfo } from '../../context/AppSettingsContext'
import { formatKES, formatDate, getStatusLabel } from '../../utils/helpers'

// ── STATUS CONFIG ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:          { icon: Clock,         color: 'amber',  bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700'  },
  approved:         { icon: CheckCircle,   color: 'blue',   bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700'   },
  preparing:        { icon: Package,       color: 'purple', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  out_for_delivery: { icon: Truck,         color: 'brand',  bg: 'bg-brand-50',  border: 'border-brand-200',  text: 'text-brand-700'  },
  completed:        { icon: CheckCircle,   color: 'green',  bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700'  },
  rejected:         { icon: XCircle,       color: 'red',    bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700'    },
  cancelled:        { icon: XCircle,       color: 'slate',  bg: 'bg-admin-50',  border: 'border-admin-200',  text: 'text-admin-500'  },
}

// ── PROGRESS STEPS ────────────────────────────────────────────────────────────
const STEPS = [
  { key: 'pending',          label: 'Received' },
  { key: 'approved',         label: 'Confirmed' },
  { key: 'preparing',        label: 'Preparing' },
  { key: 'out_for_delivery', label: 'On the way' },
  { key: 'completed',        label: 'Delivered' },
]

function OrderProgress({ status }) {
  if (['rejected', 'cancelled'].includes(status)) return null
  const currentIdx = STEPS.findIndex(s => s.key === status)

  return (
    <div className="mb-6">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const done    = i < currentIdx
          const active  = i === currentIdx
          const pending = i > currentIdx

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold
                  transition-all border-2 ${
                    done   ? 'bg-brand-500 border-brand-500 text-white' :
                    active ? 'bg-white border-brand-500 text-brand-600 ring-4 ring-brand-100' :
                             'bg-white border-earth-200 text-earth-300'
                  }`}>
                  {done ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : i + 1}
                </div>
                <span className={`text-xs mt-1.5 font-body whitespace-nowrap ${
                  active ? 'text-brand-600 font-semibold' :
                  done   ? 'text-earth-600' : 'text-earth-300'
                }`}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-5 transition-colors ${
                  done ? 'bg-brand-500' : 'bg-earth-100'
                }`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TrackOrderPage() {
  const shopInfo = useShopInfo()
  const [phone, setPhone] = useState('')
  const [ref, setRef] = useState('')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTrack = async (e) => {
    e.preventDefault()
    if (!phone.trim() || !ref.trim()) return
    setLoading(true)
    setError('')
    setOrder(null)
    try {
      const res = await orderService.trackOrder(phone.trim(), ref.trim().toUpperCase())
      setOrder(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Order not found. Check your phone number and reference.')
    } finally {
      setLoading(false)
    }
  }

  const statusCfg = order ? (STATUS_CONFIG[order.status] || STATUS_CONFIG.pending) : null
  const StatusIcon = statusCfg?.icon

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-earth-200 pt-10 pb-16">
        <div className="container-page max-w-2xl text-center">
          <div className="w-14 h-14 bg-brand-100 border border-brand-200 rounded-2xl
            flex items-center justify-center mx-auto mb-4">
            <Package size={26} className="text-brand-700" />
          </div>
          <h1 className="font-display text-3xl font-bold text-earth-900 mb-2">Track Your Order</h1>
          <p className="text-earth-500 font-body text-sm">
            Enter your phone number and order reference to see the latest status
          </p>
        </div>
      </div>

      {/* ── Search card (overlaps hero) ────────────────────────────────────── */}
      <div className="container-page max-w-2xl -mt-8 pb-12">
        <div className="bg-white rounded-2xl shadow-warm-lg border border-earth-100 p-6 mb-6">
          <form onSubmit={handleTrack} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-body font-semibold text-earth-600
                  uppercase tracking-wide mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  className="w-full border border-earth-200 rounded-xl px-4 py-3 text-sm font-body
                    text-earth-800 placeholder-earth-400 focus:outline-none focus:ring-2
                    focus:ring-brand-400 focus:border-transparent transition-all bg-earth-50"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-body font-semibold text-earth-600
                  uppercase tracking-wide mb-1.5">
                  Order Reference
                </label>
                <input
                  type="text"
                  value={ref}
                  onChange={e => setRef(e.target.value.toUpperCase())}
                  placeholder="ORD-2026-0001"
                  className="w-full border border-earth-200 rounded-xl px-4 py-3 text-sm font-body
                    text-earth-800 placeholder-earth-400 focus:outline-none focus:ring-2
                    focus:ring-brand-400 focus:border-transparent transition-all bg-earth-50 uppercase tracking-wider"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-sm text-red-700 font-body flex items-start gap-2">
                <XCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-700
                text-white rounded-xl font-body font-semibold text-sm hover:bg-brand-800
                active:scale-[0.99] transition-all disabled:opacity-60">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                  Searching…
                </>
              ) : (
                <>
                  <Search size={17} />
                  Track Order
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── Order result ───────────────────────────────────────────────── */}
        {order && statusCfg && (
          <div className="bg-white rounded-2xl shadow-warm border border-earth-100 overflow-hidden page-enter">

            {/* Status banner */}
            <div className={`px-6 py-4 flex items-center gap-4 ${statusCfg.bg} border-b ${statusCfg.border}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                bg-white border ${statusCfg.border}`}>
                <StatusIcon size={20} className={statusCfg.text} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-display font-bold text-base ${statusCfg.text}`}>
                  {getStatusLabel(order.status)}
                </p>
                <p className="text-earth-500 text-xs font-body mt-0.5">
                  {order.orderRef} · {formatDate(order.createdAt)}
                </p>
              </div>
              <span className={`text-xs font-body font-semibold px-3 py-1.5 rounded-full border ${statusCfg.bg} ${statusCfg.border} ${statusCfg.text}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>

            <div className="p-6 space-y-6">

              {/* Progress bar */}
              <OrderProgress status={order.status} />

              {/* Rejection reason */}
              {order.status === 'rejected' && order.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm font-body text-red-700">
                  <p className="font-semibold text-red-800 mb-1">Order Declined</p>
                  {order.rejectionReason}
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-xs font-body font-semibold text-earth-500 uppercase tracking-wide mb-3">
                  Items Ordered
                </p>
                <div className="bg-earth-50 rounded-xl overflow-hidden">
                  {order.orderItems?.map((item, i) => (
                    <div key={i}
                      className="flex items-center justify-between px-4 py-3 border-b border-earth-100 last:border-0">
                      <div className="min-w-0">
                        <p className="font-body font-medium text-earth-800 text-sm truncate">
                          {item.productName}
                        </p>
                        <p className="text-earth-400 text-xs mt-0.5">
                          {item.variety} · {item.packaging} × {item.quantity}
                        </p>
                      </div>
                      <span className="font-body font-semibold text-earth-700 text-sm ml-4 flex-shrink-0">
                        {formatKES(item.lineTotal)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3 bg-earth-100">
                    <span className="font-body font-bold text-earth-800 text-sm">Total</span>
                    <span className="font-display font-bold text-brand-600 text-base">
                      {formatKES(order.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              {order.statusHistory?.length > 0 && (
                <div>
                  <p className="text-xs font-body font-semibold text-earth-500 uppercase tracking-wide mb-4">
                    Status History
                  </p>
                  <OrderStatusTimeline
                    history={order.statusHistory}
                    currentStatus={order.status}
                  />
                </div>
              )}

              {/* Contact */}
              <div className="bg-earth-50 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <p className="font-body font-medium text-earth-700 text-sm">Questions about your order?</p>
                  <p className="text-earth-400 text-xs mt-0.5">Our team is available {shopInfo.hours}</p>
                </div>
                <a href={`tel:${shopInfo.phone}`}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-700 text-white
                    rounded-xl text-sm font-body font-semibold hover:bg-brand-800 transition-colors
                    whitespace-nowrap flex-shrink-0">
                  <Phone size={15} />
                  Call Us
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── Help text (no order yet) ────────────────────────────────────── */}
        {!order && !loading && (
          <div className="text-center text-earth-400 text-sm font-body space-y-1 mt-2">
            <p>Your order reference was sent to you via SMS after placing your order.</p>
            <p>It looks like <span className="font-medium text-earth-600">ORD-2026-0001</span></p>
          </div>
        )}
      </div>
    </div>
  )
}
