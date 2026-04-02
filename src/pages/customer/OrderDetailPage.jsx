import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Phone, XCircle, Package, Truck, Store, CreditCard, Receipt as ReceiptIcon } from 'lucide-react'
import { orderService } from '../../services/order.service'
import { OrderStatusTimeline } from '../../components/orders/OrderStatusTimeline'
import { useShopInfo } from '../../context/AppSettingsContext'
import { formatKES, formatDate, getStatusLabel } from '../../utils/helpers'
import { PAYMENT_LABELS } from '../../utils/constants'
import Spinner from '../../components/ui/Spinner'
import Receipt from '../../components/orders/Receipt'

const STATUS_STEPS = ['pending', 'approved', 'preparing', 'out_for_delivery', 'completed']

const STEP_LABELS = {
  pending: 'Received', approved: 'Confirmed', preparing: 'Preparing',
  out_for_delivery: 'On the Way', completed: 'Delivered'
}

const STATUS_CONFIG = {
  pending:          { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  dot: 'bg-amber-400'  },
  approved:         { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   dot: 'bg-blue-400'   },
  preparing:        { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-400' },
  out_for_delivery: { bg: 'bg-brand-50',  border: 'border-brand-200',  text: 'text-brand-700',  dot: 'bg-brand-400'  },
  completed:        { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  dot: 'bg-green-400'  },
  rejected:         { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    dot: 'bg-red-400'    },
  cancelled:        { bg: 'bg-earth-50',  border: 'border-earth-200',  text: 'text-earth-500',  dot: 'bg-earth-300'  },
}

export default function CustomerOrderDetailPage() {
  const shopInfo = useShopInfo()
  const { id } = useParams()
  const [order, setOrder]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await orderService.getMyOrders({ limit: 100 })
        const found = (res.data.data.orders || []).find(o => o._id === id)
        setOrder(found || null)
      } catch { setOrder(null) }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order?')) return
    setCancelling(true)
    try {
      await orderService.cancelOrder(id)
      setOrder(o => ({ ...o, status: 'cancelled' }))
    } catch (err) {
      alert(err.response?.data?.message || 'Could not cancel order')
    } finally { setCancelling(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  if (!order) return (
    <div className="container-page py-16 text-center">
      <Package size={32} className="text-earth-300 mx-auto mb-3" />
      <p className="text-earth-500 font-body mb-4">Order not found</p>
      <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
    </div>
  )

  const currentStep = STATUS_STEPS.indexOf(order.status)
  const isTerminal  = ['completed', 'rejected', 'cancelled'].includes(order.status)
  const cfg         = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending

  // Show receipt button for all non-pending statuses
  const canViewReceipt = !['pending'].includes(order.status)

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="bg-earth-900 pt-8 pb-16 px-4">
        <div className="container-page max-w-2xl">
          <Link to="/dashboard"
            className="inline-flex items-center gap-1.5 text-earth-400 hover:text-cream
              text-sm font-body transition-colors mb-5">
            <ArrowLeft size={15} /> My Orders
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-cream mb-1">
                {order.orderRef}
              </h1>
              <p className="text-earth-400 text-sm font-body">{formatDate(order.createdAt)}</p>
            </div>
            {canViewReceipt && (
              <button onClick={() => setShowReceipt(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 border
                  border-white/20 text-cream rounded-xl text-sm font-body font-semibold
                  hover:bg-white/20 transition-colors mt-1">
                <ReceiptIcon size={15} />
                Receipt
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container-page max-w-2xl -mt-8 pb-12 space-y-4">

        {/* ── Status card ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-warm-lg border border-earth-100 overflow-hidden">
          <div className={`px-5 py-4 flex items-center gap-3 ${cfg.bg} border-b ${cfg.border}`}>
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`} />
            <p className={`font-display font-bold ${cfg.text}`}>{getStatusLabel(order.status)}</p>
          </div>

          {/* Progress bar */}
          {!isTerminal && currentStep >= 0 && (
            <div className="px-5 py-5">
              <div className="flex items-center">
                {STATUS_STEPS.map((s, i) => {
                  const done   = i < currentStep
                  const active = i === currentStep
                  return (
                    <div key={s} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full border-2 flex items-center
                          justify-center text-xs font-bold font-body transition-all ${
                            done   ? 'bg-brand-500 border-brand-500 text-white' :
                            active ? 'bg-white border-brand-500 text-brand-600 ring-4 ring-brand-100' :
                                     'bg-white border-earth-200 text-earth-300'
                          }`}>
                          {done ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                              stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : i + 1}
                        </div>
                        <span className={`text-xs mt-1 font-body whitespace-nowrap ${
                          active ? 'text-brand-600 font-semibold' :
                          done   ? 'text-earth-500' : 'text-earth-300'
                        }`}>
                          {STEP_LABELS[s]}
                        </span>
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-1 mb-5 ${
                          done ? 'bg-brand-500' : 'bg-earth-100'
                        }`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Rejection reason */}
          {order.status === 'rejected' && order.rejectionReason && (
            <div className="mx-5 mb-4 bg-red-50 border border-red-200 rounded-xl p-4
              text-sm font-body text-red-700">
              <p className="font-semibold text-red-800 mb-1">Order Declined</p>
              {order.rejectionReason}
            </div>
          )}
        </div>

        {/* ── Items ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-earth-100 shadow-warm overflow-hidden">
          <div className="px-5 py-4 border-b border-earth-50">
            <p className="text-xs font-body font-semibold text-earth-500 uppercase tracking-wide">
              Items Ordered
            </p>
          </div>
          <div className="divide-y divide-earth-50">
            {order.orderItems?.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-body font-semibold text-earth-800 text-sm">
                    {item.productName}
                  </p>
                  <p className="text-earth-400 text-xs mt-0.5 font-body">
                    {item.variety} · {item.packaging} × {item.quantity}
                  </p>
                </div>
                <span className="font-body font-bold text-earth-800 text-sm flex-shrink-0">
                  {formatKES(item.lineTotal)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between px-5 py-4 bg-earth-50">
              <span className="font-body font-bold text-earth-800">Total</span>
              <span className="font-display font-bold text-brand-600 text-lg">
                {formatKES(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Delivery + Payment ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-earth-100 shadow-warm p-5">
          <p className="text-xs font-body font-semibold text-earth-500 uppercase tracking-wide mb-4">
            Order Details
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2.5">
              {order.deliveryMethod === 'pickup' ? (
                <Store size={15} className="text-earth-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Truck size={15} className="text-earth-400 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="text-xs text-earth-400 font-body mb-0.5">Delivery</p>
                <p className="text-sm font-body font-semibold text-earth-800">
                  {order.deliveryMethod === 'pickup' ? 'Pickup from shop' : 'Home delivery'}
                </p>
                {order.deliveryAddress && (
                  <p className="text-xs text-earth-500 font-body mt-0.5 leading-relaxed">
                    {order.deliveryAddress}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CreditCard size={15} className="text-earth-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-earth-400 font-body mb-0.5">Payment</p>
                <p className="text-sm font-body font-semibold text-earth-800">
                  {PAYMENT_LABELS[order.paymentMethod]}
                </p>
                <p className={`text-xs font-body font-semibold mt-0.5 ${
                  order.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {order.paymentStatus === 'paid' ? '✓ Paid' : 'Payment pending'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Timeline ────────────────────────────────────────────── */}
        {order.statusHistory?.length > 0 && (
          <div className="bg-white rounded-2xl border border-earth-100 shadow-warm p-5">
            <p className="text-xs font-body font-semibold text-earth-500 uppercase
              tracking-wide mb-4">
              Status Timeline
            </p>
            <OrderStatusTimeline history={order.statusHistory} currentStatus={order.status} />
          </div>
        )}

        {/* ── Actions ─────────────────────────────────────────────── */}
        <div className="space-y-3">
          {canViewReceipt && (
            <button onClick={() => setShowReceipt(true)}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-brand-500
                text-white rounded-xl text-sm font-body font-semibold hover:bg-brand-600
                transition-colors">
              <ReceiptIcon size={16} /> View & Print Receipt
            </button>
          )}
          {order.status === 'pending' && (
            <button onClick={handleCancel} disabled={cancelling}
              className="flex items-center justify-center gap-2 w-full py-3.5 border-2
                border-red-200 text-red-600 rounded-xl text-sm font-body font-semibold
                hover:bg-red-50 transition-colors disabled:opacity-60">
              <XCircle size={16} />
              {cancelling ? 'Cancelling…' : 'Cancel Order'}
            </button>
          )}
          <a href={`tel:${shopInfo.phone}`}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-earth-900
              text-cream rounded-xl text-sm font-body font-semibold hover:bg-earth-800
              transition-colors">
            <Phone size={16} /> Call Us — {shopInfo.phone}
          </a>
        </div>
      </div>

      {/* ── Receipt Modal ────────────────────────────────────────── */}
      {showReceipt && (
        <Receipt
          order={order}
          variant="customer"
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  )
}
