import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, XCircle, Package, Truck, Store, CreditCard, Receipt as ReceiptIcon, AlertTriangle, RotateCcw } from 'lucide-react'
import { orderService } from '../../services/order.service'
import { OrderStatusTimeline } from '../../components/orders/OrderStatusTimeline'
import { useShopInfo } from '../../context/AppSettingsContext'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { formatKES, formatDate, getStatusLabel } from '../../utils/helpers'
import { PAYMENT_LABELS, ORDER_STATUS_CONFIG as STATUS_CONFIG } from '../../utils/constants'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import Receipt from '../../components/orders/Receipt'
import PayNowPanel from '../../components/orders/PayNowPanel'
import OrderTotals from '../../components/orders/OrderTotals'
import { paymentStatusDisplay } from '../../utils/orderDisplay'
import WhatsAppButton from '../../components/ui/WhatsAppButton'
import { shopOrderMessage } from '../../utils/whatsapp'

const STATUS_STEPS = ['pending', 'approved', 'preparing', 'out_for_delivery', 'completed']

const STEP_LABELS = {
  pending: 'Received', approved: 'Confirmed', preparing: 'Preparing',
  out_for_delivery: 'On the Way', completed: 'Delivered'
}
const PICKUP_STEP_LABELS = {
  ...STEP_LABELS, out_for_delivery: 'Ready for Pickup', completed: 'Collected'
}

export default function CustomerOrderDetailPage() {
  const shopInfo = useShopInfo()
  const { user } = useAuth()
  const { reorderItems, openCart } = useCart()
  const navigate = useNavigate()
  const { id } = useParams()
  const [order, setOrder]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)

  const handleReorder = () => {
    if (!order?.orderItems?.length) return
    reorderItems(order.orderItems)
    openCart()
  }

  const [loadFailed, setLoadFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const load = async (silent = false) => {
      if (!silent) { setLoading(true); setLoadFailed(false) }
      try {
        const res = await orderService.getMyOrder(id)
        setOrder(res.data.data || null)
      } catch (err) {
        // A 404 really is "not found"; anything else (offline, a cold server) is a
        // temporary failure and must not be reported as a missing order.
        if (!silent) { setOrder(null); setLoadFailed(err.response?.status !== 404) }
      }
      finally { if (!silent) setLoading(false) }
    }
    load()
    // Poll for status updates while the page is open — this page previously had
    // zero live refresh (load-once), unlike the admin orders list which already
    // polls every 60s. Silent: no spinner flash over a page the customer is reading.
    const interval = setInterval(() => load(true), 60000)
    return () => clearInterval(interval)
  }, [id, reloadKey])

  const handleCancel = async () => {
    setCancelling(true)
    setConfirmCancel(false)
    try {
      const res = await orderService.cancelOrder(id)
      setOrder(o => ({ ...o, status: 'cancelled', paymentStatus: res.data?.data?.paymentStatus || o.paymentStatus }))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel order')
    } finally { setCancelling(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  if (!order) return (
    <div className="container-page py-16 text-center">
      <Package size={32} className="text-earth-300 mx-auto mb-3" />
      <p className="text-earth-500 font-body mb-4">
        {loadFailed ? "We couldn't load this order — check your connection." : 'Order not found'}
      </p>
      {loadFailed && (
        <button type="button" onClick={() => setReloadKey(k => k + 1)} className="btn-primary mr-2">Try again</button>
      )}
      <Link to="/dashboard" className={loadFailed ? 'btn-outline' : 'btn-primary'}>Back to Dashboard</Link>
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
      <div className="bg-gradient-to-br from-brand-800 to-brand-900 pt-8 pb-16 px-4">
        <div className="container-page max-w-2xl">
          <Link to="/dashboard"
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white
              text-sm font-body transition-colors mb-5">
            <ArrowLeft size={15} /> My Orders
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-cream mb-1">
                {order.orderRef}
              </h1>
              <p className="text-white/70 text-sm font-body">{formatDate(order.createdAt)}</p>
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
            <p className={`font-display font-bold ${cfg.text}`}>{getStatusLabel(order.status, order.deliveryMethod)}</p>
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
                          {(order.deliveryMethod === 'pickup' ? PICKUP_STEP_LABELS : STEP_LABELS)[s]}
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
            <p className="text-xs font-body font-semibold text-earth-700 uppercase tracking-wide">
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
                  <p className="text-earth-600 text-xs mt-0.5 font-body">
                    {item.variety} · {item.packaging} × {item.quantity}
                  </p>
                </div>
                <span className="font-body font-bold text-earth-800 text-sm flex-shrink-0">
                  {formatKES(item.lineTotal)}
                </span>
              </div>
            ))}
            <OrderTotals order={order} />
            <div className="flex items-center justify-between px-5 py-4 bg-earth-50">
              <span className="font-body font-bold text-earth-800">Total</span>
              <span className="font-display font-bold text-brand-600 text-lg">
                {formatKES(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Pay now (unpaid, still awaiting approval) ──────────────── */}
        <PayNowPanel
          order={order}
          defaultPhone={user?.phone || ''}
          onPaid={() => setReloadKey(k => k + 1)}
          onChanged={(patch) => setOrder(o => ({ ...o, ...patch }))}
        />

        {/* ── Delivery + Payment ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-earth-100 shadow-warm p-5">
          <p className="text-xs font-body font-semibold text-earth-700 uppercase tracking-wide mb-4">
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
                <p className="text-xs text-earth-600 font-body mb-0.5">Delivery</p>
                <p className="text-sm font-body font-semibold text-earth-800">
                  {order.deliveryMethod === 'pickup' ? 'Pickup from shop' : 'Home delivery'}
                </p>
                {order.deliveryAddress && (
                  <p className="text-xs text-earth-600 font-body mt-0.5 leading-relaxed">
                    {order.deliveryAddress}
                  </p>
                )}
                {order.deliveryMethod === 'delivery' && order.driverId && (
                  <p className="text-xs text-earth-600 font-body mt-1">
                    Rider: <span className="font-semibold">{order.driverId.name}</span>
                    {order.driverId.vehicleInfo?.type ? ` (${order.driverId.vehicleInfo.type})` : ''}
                  </p>
                )}
                {order.deliveryMethod === 'delivery' && !order.driverId && order.preferredDriverId?.name && (
                  <p className="text-xs text-earth-400 font-body mt-1">
                    Requested rider: {order.preferredDriverId.name} (not yet confirmed)
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CreditCard size={15} className="text-earth-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-earth-600 font-body mb-0.5">Payment</p>
                <p className="text-sm font-body font-semibold text-earth-800">
                  {PAYMENT_LABELS[order.paymentMethod]}
                </p>
                <p className={`text-xs font-body font-semibold mt-0.5 ${paymentStatusDisplay(order).tone}`}>
                  {paymentStatusDisplay(order).label}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Timeline ────────────────────────────────────────────── */}
        {order.statusHistory?.length > 0 && (
          <div className="bg-white rounded-2xl border border-earth-100 shadow-warm p-5">
            <p className="text-xs font-body font-semibold text-earth-700 uppercase
              tracking-wide mb-4">
              Status Timeline
            </p>
            <OrderStatusTimeline history={order.statusHistory} currentStatus={order.status}
              deliveryMethod={order.deliveryMethod} />
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
          {isTerminal && (
            <button onClick={handleReorder}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-white
                border-2 border-brand-300 text-brand-700 rounded-xl text-sm font-body
                font-semibold hover:bg-brand-50 transition-colors">
              <RotateCcw size={16} /> Reorder Same Items
            </button>
          )}
          {order.status === 'pending' && (
            confirmCancel ? (
              <div className="flex items-center gap-2 p-4 border-2 border-red-200 rounded-xl bg-red-50">
                <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
                <span className="text-sm font-body text-red-700 flex-1">
                  Cancel this order?
                  {order.paymentStatus === 'paid' && (
                    <span className="block text-xs text-red-600 mt-0.5">You have already paid — we will refund you.</span>
                  )}
                </span>
                <button onClick={handleCancel} disabled={cancelling}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-body
                    font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors">
                  {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                </button>
                <button onClick={() => setConfirmCancel(false)}
                  className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg
                    text-xs font-body font-semibold hover:bg-white transition-colors">
                  No
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmCancel(true)}
                className="flex items-center justify-center gap-2 w-full py-3.5 border-2
                  border-red-200 text-red-600 rounded-xl text-sm font-body font-semibold
                  hover:bg-red-50 transition-colors">
                <XCircle size={16} />
                Cancel Order
              </button>
            )
          )}
          <WhatsAppButton phone={shopInfo.whatsapp || shopInfo.phone}
            message={shopOrderMessage({ ref: order.orderRef, total: order.total })}
            label="Ask about this order on WhatsApp" size={16}
            className="w-full py-3.5 border-2 border-green-200 text-green-700 rounded-xl text-sm font-body hover:bg-green-50" />
          <a href={`tel:${shopInfo.phone}`}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-brand-700
              text-white rounded-xl text-sm font-body font-semibold hover:bg-brand-800
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
