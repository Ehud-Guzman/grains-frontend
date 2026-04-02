import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Receipt from '../../../components/orders/Receipt'
import {
  ArrowLeft, Check, X, Printer, Phone, MapPin,
  CreditCard, Truck, Store, Package, ChevronRight,
  AlertTriangle, Clock, BadgeCheck, Ban
} from 'lucide-react'
import { adminOrderService } from '../../../services/admin/order.service'
import { useOnboarding } from '../../../context/OnboardingContext'
import { OrderStatusTimeline } from '../../../components/orders/OrderStatusTimeline'
import { formatKES, formatDate, getStatusLabel, timeAgo } from '../../../utils/helpers'
import { PAYMENT_LABELS } from '../../../utils/constants'
import Spinner from '../../../components/ui/Spinner'
import toast from 'react-hot-toast'

// ── STATUS CONFIG ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:          { bg: 'bg-amber-50',   border: 'border-amber-200',  text: 'text-amber-700',  dot: 'bg-amber-400',  icon: Clock        },
  approved:         { bg: 'bg-blue-50',    border: 'border-blue-200',   text: 'text-blue-700',   dot: 'bg-blue-400',   icon: BadgeCheck   },
  preparing:        { bg: 'bg-purple-50',  border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-400', icon: Package      },
  out_for_delivery: { bg: 'bg-brand-50',   border: 'border-brand-200',  text: 'text-brand-700',  dot: 'bg-brand-400',  icon: Truck        },
  completed:        { bg: 'bg-green-50',   border: 'border-green-200',  text: 'text-green-700',  dot: 'bg-green-400',  icon: BadgeCheck   },
  rejected:         { bg: 'bg-red-50',     border: 'border-red-200',    text: 'text-red-700',    dot: 'bg-red-400',    icon: Ban          },
  cancelled:        { bg: 'bg-admin-50',   border: 'border-admin-200',  text: 'text-admin-500',  dot: 'bg-admin-300',  icon: X            },
}

const NEXT_STATUSES = {
  approved:         [{ value: 'preparing',        label: 'Mark as Preparing',        icon: Package }],
  preparing:        [{ value: 'out_for_delivery', label: 'Mark Out for Delivery',    icon: Truck   }],
  out_for_delivery: [{ value: 'completed',        label: 'Mark as Completed',        icon: Check   }],
}

// ── SECTION CARD ──────────────────────────────────────────────────────────────
function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-admin-100 shadow-sm overflow-hidden ${className}`}>
      {title && (
        <div className="px-5 py-3.5 border-b border-admin-100 bg-admin-50/40">
          <h2 className="font-admin font-semibold text-admin-700 text-sm tracking-wide uppercase">{title}</h2>
        </div>
      )}
      {children}
    </div>
  )
}

// ── DETAIL ROW ────────────────────────────────────────────────────────────────
function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-admin-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-admin-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-admin-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-admin text-admin-400 mb-0.5">{label}</p>
        <div className="text-sm font-admin font-medium text-admin-800">{children}</div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AdminOrderDetailPage() {
  const { markChecklistItem, markMilestone } = useOnboarding()
  const { id } = useParams()
  const [order, setOrder]               = useState(null)
  const [loading, setLoading]           = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [showReceipt, setShowReceipt]   = useState(false)

  const fetchOrder = async () => {
    try {
      const res = await adminOrderService.getById(id)
      setOrder(res.data.data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchOrder() }, [id])

  const handleApprove = async () => {
    setActionLoading(true)
    try {
      await adminOrderService.approve(id)
      markChecklistItem('admin', 'orders')
      markMilestone('admin-first-approval')
      toast.success('Order approved — stock deducted')
      fetchOrder()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve')
    } finally { setActionLoading(false) }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) return toast.error('Reason is required')
    setActionLoading(true)
    try {
      await adminOrderService.reject(id, rejectReason)
      toast.success('Order rejected')
      setShowRejectForm(false)
      fetchOrder()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject')
    } finally { setActionLoading(false) }
  }

  const handleStatusUpdate = async (status) => {
    setActionLoading(true)
    try {
      await adminOrderService.updateStatus(id, status)
      toast.success(`Order marked as ${getStatusLabel(status)}`)
      fetchOrder()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally { setActionLoading(false) }
  }

  // ── LOADING / NOT FOUND ───────────────────────────────────────────────────
  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <Spinner size="lg" />
    </div>
  )

  if (!order) return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-14 h-14 rounded-2xl bg-admin-100 flex items-center justify-center mb-4">
        <Package size={24} className="text-admin-300" />
      </div>
      <p className="font-admin font-semibold text-admin-700 mb-1">Order not found</p>
      <p className="text-admin-400 text-sm font-admin mb-4">It may have been removed or the link is invalid.</p>
      <Link to="/admin/orders"
        className="text-brand-600 text-sm font-admin font-medium hover:underline flex items-center gap-1">
        <ArrowLeft size={14} /> Back to Orders
      </Link>
    </div>
  )

  const customer    = order.userId || order.guestId
  const nextActions = NEXT_STATUSES[order.status] || []
  const cfg         = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const StatusIcon  = cfg.icon

  return (
    <>
      <div className="p-5 lg:p-7 max-w-6xl mx-auto pb-14">

        {/* ── TOPBAR ───────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <Link to="/admin/orders"
            className="inline-flex items-center gap-1.5 text-admin-400 hover:text-admin-700
              text-sm font-admin transition-colors mb-5 group">
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Orders
          </Link>

          <div className="flex items-start justify-between flex-wrap gap-4">
            {/* Left — ref + time */}
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-admin font-bold text-admin-900 tracking-tight">
                  {order.orderRef}
                </h1>
                <span className={`inline-flex items-center gap-1.5 text-xs font-admin font-semibold
                  px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  <StatusIcon size={11} />
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <p className="text-admin-400 text-sm mt-1.5 font-admin">
                {formatDate(order.createdAt)}
                <span className="mx-2 text-admin-200">·</span>
                {timeAgo(order.createdAt)}
              </p>
            </div>

            {/* Right — actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowReceipt(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border
                  border-admin-200 bg-white text-admin-600 text-sm font-admin font-medium
                  hover:bg-admin-50 hover:border-admin-300 transition-all shadow-sm active:scale-[0.98]">
                <Printer size={14} />
                Packing Slip
              </button>
            </div>
          </div>
        </div>

        {/* ── GRID ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── LEFT — main content ────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Alerts */}
            {order.specialInstructions && (
              <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
                <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-admin font-bold text-amber-700 uppercase tracking-wider mb-1">
                    Special Instructions
                  </p>
                  <p className="text-amber-900 text-sm font-admin leading-relaxed">
                    {order.specialInstructions}
                  </p>
                </div>
              </div>
            )}

            {order.status === 'rejected' && order.rejectionReason && (
              <div className="flex gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
                <Ban size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-admin font-bold text-red-700 uppercase tracking-wider mb-1">
                    Rejection Reason
                  </p>
                  <p className="text-red-800 text-sm font-admin">{order.rejectionReason}</p>
                </div>
              </div>
            )}

            {/* Items */}
            <Card title={`Order Items · ${order.orderItems?.length} item${order.orderItems?.length !== 1 ? 's' : ''}`}>
              <div className="divide-y divide-admin-50">
                {order.orderItems?.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    {/* Index pill */}
                    <div className="w-7 h-7 rounded-lg bg-admin-100 flex items-center justify-center
                      flex-shrink-0 text-xs font-admin font-bold text-admin-500">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-admin font-semibold text-admin-800 text-sm truncate">
                        {item.productName}
                      </p>
                      <p className="text-admin-400 text-xs mt-0.5 font-admin">
                        {item.variety} · {item.packaging}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-0.5">
                      <p className="font-admin font-bold text-admin-800 text-sm">
                        {formatKES(item.lineTotal)}
                      </p>
                      <p className="text-admin-400 text-xs font-admin">
                        {formatKES(item.unitPrice)} × {item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-admin-100 bg-admin-50/50 px-5 py-4 space-y-2">
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between text-sm font-admin">
                    <span className="text-admin-500 flex items-center gap-1.5">
                      <Truck size={12} /> Delivery fee
                    </span>
                    <span className="text-admin-700">{formatKES(order.deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1">
                  <span className="font-admin font-bold text-admin-800">Total</span>
                  <span className="font-admin font-bold text-brand-600 text-xl">
                    {formatKES(order.total)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Status Timeline */}
            {order.statusHistory?.length > 0 && (
              <Card title="Status History">
                <div className="px-5 py-5">
                  <OrderStatusTimeline
                    history={order.statusHistory}
                    currentStatus={order.status}
                  />
                </div>
              </Card>
            )}
          </div>

          {/* ── RIGHT — sidebar ───────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Approve / Reject — pending only */}
            {order.status === 'pending' && (
              <Card title="Actions">
                <div className="p-4 space-y-2.5">
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-green-600
                      text-white rounded-xl text-sm font-admin font-semibold hover:bg-green-700
                      disabled:opacity-50 transition-all active:scale-[0.98] shadow-sm">
                    <Check size={15} /> Approve Order
                  </button>

                  {!showRejectForm ? (
                    <button
                      onClick={() => setShowRejectForm(true)}
                      className="flex items-center justify-center gap-2 w-full py-3 border-2
                        border-red-200 text-red-600 rounded-xl text-sm font-admin font-semibold
                        hover:bg-red-50 transition-colors">
                      <X size={15} /> Reject Order
                    </button>
                  ) : (
                    <div className="border border-red-200 rounded-xl p-4 bg-red-50 space-y-3">
                      <p className="text-xs font-admin font-semibold text-red-700 uppercase tracking-wide">
                        Rejection Reason <span className="text-red-400 normal-case font-normal">*required</span>
                      </p>
                      <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="e.g. Product out of stock, delivery not available…"
                        rows={3}
                        autoFocus
                        className="w-full border border-red-200 rounded-lg px-3 py-2.5 text-sm
                          font-admin text-admin-800 focus:outline-none focus:ring-2
                          focus:ring-red-300 resize-none bg-white placeholder:text-admin-300"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleReject}
                          disabled={actionLoading || !rejectReason.trim()}
                          className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm
                            font-admin font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                          Confirm Reject
                        </button>
                        <button
                          onClick={() => { setShowRejectForm(false); setRejectReason('') }}
                          className="flex-1 py-2.5 border border-admin-200 text-admin-600 rounded-lg
                            text-sm font-admin font-medium hover:bg-white transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Pipeline status update */}
            {nextActions.length > 0 && (
              <Card title="Update Status">
                <div className="p-4 space-y-2">
                  {nextActions.map(action => {
                    const ActionIcon = action.icon
                    return (
                      <button
                        key={action.value}
                        onClick={() => handleStatusUpdate(action.value)}
                        disabled={actionLoading}
                        className="flex items-center justify-between w-full px-4 py-3 bg-brand-500
                          text-white rounded-xl text-sm font-admin font-semibold hover:bg-brand-600
                          disabled:opacity-50 transition-all active:scale-[0.98] shadow-sm group">
                        <span className="flex items-center gap-2">
                          <ActionIcon size={14} /> {action.label}
                        </span>
                        <ChevronRight size={14} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* Customer */}
            <Card title="Customer">
              <div className="px-5 py-4 space-y-1">
                {/* Avatar + name */}
                <div className="flex items-center gap-3 pb-3 mb-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-brand-100 to-brand-200
                    rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-brand-700 text-sm font-bold font-admin">
                      {(customer?.name || 'G').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-admin font-semibold text-admin-800 text-sm leading-tight">
                      {customer?.name || 'Guest'}
                    </p>
                    <span className="text-xs font-admin text-admin-400">
                      {order.userId ? 'Registered customer' : 'Guest order'}
                    </span>
                  </div>
                </div>

                {customer?.phone && (
                  <DetailRow icon={Phone} label="Phone">
                    <a href={`tel:${customer.phone}`}
                      className="text-brand-600 hover:text-brand-700 hover:underline transition-colors">
                      {customer.phone}
                    </a>
                  </DetailRow>
                )}

                <DetailRow
                  icon={order.deliveryMethod === 'pickup' ? Store : MapPin}
                  label={order.deliveryMethod === 'pickup' ? 'Delivery' : 'Delivery Address'}>
                  {order.deliveryMethod === 'pickup'
                    ? 'Pickup from shop'
                    : order.deliveryAddress || '—'}
                </DetailRow>
              </div>
            </Card>

            {/* Payment */}
            <Card title="Payment">
              <div className="px-5 py-4 space-y-1">
                <DetailRow icon={CreditCard} label="Method">
                  {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
                </DetailRow>

                <DetailRow icon={order.deliveryMethod === 'pickup' ? Store : Truck} label="Fulfillment">
                  {order.deliveryMethod === 'pickup' ? 'Pickup from shop' : 'Home delivery'}
                </DetailRow>

                {/* Payment status pill */}
                <div className="flex items-center justify-between pt-3 mt-1 border-t border-admin-50">
                  <span className="text-xs font-admin text-admin-400">Payment status</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-admin font-semibold
                    px-3 py-1.5 rounded-full border ${
                      order.paymentStatus === 'paid'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : order.paymentStatus === 'failed'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      order.paymentStatus === 'paid'   ? 'bg-green-400' :
                      order.paymentStatus === 'failed' ? 'bg-red-400'   : 'bg-amber-400'
                    }`} />
                    {order.paymentStatus === 'paid'   ? 'Paid'    :
                     order.paymentStatus === 'failed' ? 'Failed'  : 'Pending'}
                  </span>
                </div>
              </div>
            </Card>

          </div>
        </div>
      </div>

      {/* ── RECEIPT MODAL ────────────────────────────────────────────────────── */}
      {showReceipt && (
        <Receipt
          order={order}
          variant="admin"
          onClose={() => setShowReceipt(false)}
        />
      )}
    </>
  )
}
