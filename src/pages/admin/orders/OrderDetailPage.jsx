import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Check, X, Printer, Phone, MapPin,
  CreditCard, Truck, Store, Clock, CheckCircle, XCircle, Package
} from 'lucide-react'
import { adminOrderService } from '../../../services/admin/order.service'
import { OrderStatusTimeline } from '../../../components/orders/OrderStatusTimeline'
import { formatKES, formatDate, getStatusLabel, timeAgo } from '../../../utils/helpers'
import { PAYMENT_LABELS } from '../../../utils/constants'
import Spinner from '../../../components/ui/Spinner'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  pending:          { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  dot: 'bg-amber-400'  },
  approved:         { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   dot: 'bg-blue-400'   },
  preparing:        { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-400' },
  out_for_delivery: { bg: 'bg-brand-50',  border: 'border-brand-200',  text: 'text-brand-700',  dot: 'bg-brand-400'  },
  completed:        { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  dot: 'bg-green-400'  },
  rejected:         { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    dot: 'bg-red-400'    },
  cancelled:        { bg: 'bg-admin-50',  border: 'border-admin-200',  text: 'text-admin-500',  dot: 'bg-admin-300'  },
}

const NEXT_STATUSES = {
  approved:         [{ value: 'preparing',        label: 'Mark as Preparing'       }],
  preparing:        [{ value: 'out_for_delivery', label: 'Mark Out for Delivery'   }],
  out_for_delivery: [{ value: 'completed',        label: 'Mark as Completed'       }],
}

export default function AdminOrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

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

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!order) return (
    <div className="p-6 text-center py-20">
      <Package size={28} className="text-admin-300 mx-auto mb-3" />
      <p className="text-admin-500 font-admin">Order not found</p>
      <Link to="/admin/orders" className="text-brand-600 text-sm mt-2 block hover:underline">← Back to orders</Link>
    </div>
  )

  const customer = order.userId || order.guestId
  const nextActions = NEXT_STATUSES[order.status] || []
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending

  return (
    <div className="p-6 max-w-5xl mx-auto pb-10 print-area">

      {/* ── Back + Header ───────────────────────────────────────────────── */}
      <div className="no-print mb-5">
        <Link to="/admin/orders"
          className="inline-flex items-center gap-1.5 text-admin-500 hover:text-admin-700
            text-sm font-admin transition-colors mb-4">
          <ArrowLeft size={15} /> Back to Orders
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-admin font-bold text-admin-900 tracking-wide">
              {order.orderRef}
            </h1>
            <p className="text-admin-400 text-sm mt-0.5 font-admin">
              {formatDate(order.createdAt)} · {timeAgo(order.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-admin font-semibold
              px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {getStatusLabel(order.status)}
            </span>
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-admin-200 rounded-lg
                text-sm font-admin text-admin-600 hover:bg-admin-50 transition-colors no-print">
              <Printer size={14} /> Packing Slip
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Items table */}
          <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden">
            <div className="px-5 py-4 border-b border-admin-100 flex items-center justify-between">
              <h2 className="font-admin font-bold text-admin-900">Order Items</h2>
              <span className="text-xs font-admin text-admin-400">
                {order.orderItems?.length} item{order.orderItems?.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="divide-y divide-admin-50">
              {order.orderItems?.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-admin font-semibold text-admin-800 text-sm">{item.productName}</p>
                    <p className="text-admin-400 text-xs mt-0.5 font-admin">
                      {item.variety} · {item.packaging} · Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-admin font-bold text-admin-800">{formatKES(item.lineTotal)}</p>
                    <p className="text-admin-400 text-xs font-admin">{formatKES(item.unitPrice)} / unit</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Totals */}
            <div className="border-t border-admin-100 px-5 py-4 space-y-2 bg-admin-50/50">
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-sm font-admin">
                  <span className="text-admin-500">Delivery fee</span>
                  <span className="text-admin-700">{formatKES(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-admin">
                <span className="font-bold text-admin-800">Total</span>
                <span className="font-bold text-brand-600 text-lg">{formatKES(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Special instructions */}
          {order.specialInstructions && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
              <p className="text-xs font-admin font-bold text-amber-700 uppercase tracking-wider mb-1.5">
                ⚠ Special Instructions
              </p>
              <p className="text-amber-900 text-sm font-admin leading-relaxed">
                {order.specialInstructions}
              </p>
            </div>
          )}

          {/* Rejection reason */}
          {order.status === 'rejected' && order.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4">
              <p className="text-xs font-admin font-bold text-red-700 uppercase tracking-wider mb-1.5">
                Rejection Reason
              </p>
              <p className="text-red-800 text-sm font-admin">{order.rejectionReason}</p>
            </div>
          )}

          {/* Status timeline */}
          {order.statusHistory?.length > 0 && (
            <div className="bg-white rounded-xl border border-admin-200 shadow-admin px-5 py-5">
              <h2 className="font-admin font-bold text-admin-900 mb-4">Status History</h2>
              <OrderStatusTimeline history={order.statusHistory} currentStatus={order.status} />
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
        <div className="space-y-4 no-print">

          {/* Approve / Reject */}
          {order.status === 'pending' && (
            <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5">
              <h2 className="font-admin font-bold text-admin-900 mb-4">Actions</h2>
              <div className="space-y-2">
                <button onClick={handleApprove} disabled={actionLoading}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-green-600
                    text-white rounded-xl text-sm font-admin font-semibold hover:bg-green-700
                    disabled:opacity-50 transition-all active:scale-[0.98]">
                  <Check size={16} /> Approve Order
                </button>

                {!showRejectForm ? (
                  <button onClick={() => setShowRejectForm(true)}
                    className="flex items-center justify-center gap-2 w-full py-3 border-2
                      border-red-200 text-red-600 rounded-xl text-sm font-admin font-semibold
                      hover:bg-red-50 transition-colors">
                    <X size={16} /> Reject Order
                  </button>
                ) : (
                  <div className="border border-red-200 rounded-xl p-4 bg-red-50 space-y-3">
                    <p className="text-xs font-admin font-semibold text-red-700 uppercase tracking-wide">
                      Rejection Reason <span className="text-red-400">*</span>
                    </p>
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="e.g. Product out of stock, delivery not available…"
                      rows={3} autoFocus
                      className="w-full border border-red-200 rounded-lg px-3 py-2.5 text-sm
                        font-admin text-admin-800 focus:outline-none focus:ring-2
                        focus:ring-red-300 resize-none bg-white"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}
                        className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm
                          font-admin font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                        Confirm Reject
                      </button>
                      <button onClick={() => { setShowRejectForm(false); setRejectReason('') }}
                        className="flex-1 py-2.5 border border-admin-200 text-admin-600 rounded-lg
                          text-sm font-admin font-medium hover:bg-white transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pipeline status update */}
          {nextActions.length > 0 && (
            <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5">
              <h2 className="font-admin font-bold text-admin-900 mb-3">Update Status</h2>
              <div className="space-y-2">
                {nextActions.map(action => (
                  <button key={action.value}
                    onClick={() => handleStatusUpdate(action.value)}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-brand-500
                      text-white rounded-xl text-sm font-admin font-semibold hover:bg-brand-600
                      disabled:opacity-50 transition-all active:scale-[0.98]">
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customer */}
          <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5">
            <h2 className="font-admin font-bold text-admin-900 mb-4">Customer</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-brand-700 text-sm font-bold font-admin">
                    {(customer?.name || 'G').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-admin font-semibold text-admin-800 text-sm">
                    {customer?.name || 'Guest'}
                  </p>
                  {!order.userId && (
                    <span className="text-xs text-admin-400 font-admin">Guest order</span>
                  )}
                </div>
              </div>

              {customer?.phone && (
                <a href={`tel:${customer.phone}`}
                  className="flex items-center gap-2 px-3 py-2.5 bg-admin-50 rounded-lg
                    text-brand-600 hover:bg-brand-50 hover:text-brand-700 transition-colors group">
                  <Phone size={14} className="flex-shrink-0" />
                  <span className="text-sm font-admin font-medium">{customer.phone}</span>
                </a>
              )}

              {order.deliveryMethod === 'delivery' && order.deliveryAddress && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-admin-50 rounded-lg">
                  <MapPin size={14} className="text-admin-400 flex-shrink-0 mt-0.5" />
                  <p className="text-admin-600 text-xs font-admin leading-relaxed">{order.deliveryAddress}</p>
                </div>
              )}

              {order.deliveryMethod === 'pickup' && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-admin-50 rounded-lg">
                  <Store size={14} className="text-admin-400 flex-shrink-0" />
                  <span className="text-admin-600 text-xs font-admin">Pickup from shop</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5">
            <h2 className="font-admin font-bold text-admin-900 mb-4">Payment</h2>
            <div className="space-y-2.5">
              {[
                {
                  icon: CreditCard, label: 'Method',
                  value: PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod
                },
                {
                  icon: order.deliveryMethod === 'pickup' ? Store : Truck, label: 'Delivery',
                  value: order.deliveryMethod === 'pickup' ? 'Pickup from shop' : 'Home delivery'
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-admin-500">
                    <Icon size={13} />
                    <span className="text-xs font-admin">{label}</span>
                  </div>
                  <span className="text-sm font-admin font-medium text-admin-800">{value}</span>
                </div>
              ))}

              <div className="flex items-center justify-between pt-1 border-t border-admin-100">
                <span className="text-xs font-admin text-admin-500">Status</span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-admin font-semibold
                  px-2.5 py-1 rounded-full border ${
                    order.paymentStatus === 'paid'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    order.paymentStatus === 'paid' ? 'bg-green-400' : 'bg-amber-400'
                  }`} />
                  {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}