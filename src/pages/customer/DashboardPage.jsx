import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, ChevronRight, XCircle, ShoppingBag, Clock, UserCircle, Sparkles, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useOnboarding } from '../../context/OnboardingContext'
import { orderService } from '../../services/order.service'
import { OnboardingChecklistCard } from '../../components/onboarding/OnboardingEnhancements'
import { formatKES, formatDate, getStatusLabel, timeAgo } from '../../utils/helpers'
import { ORDER_STATUS_CONFIG as STATUS_CONFIG } from '../../utils/constants'
import Spinner from '../../components/ui/Spinner'

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-body font-semibold
      px-2.5 py-1 rounded-full border ${cfg.badge} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {getStatusLabel(status)}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-earth-100 p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-earth-100 rounded w-32" />
          <div className="h-3 bg-earth-100 rounded w-48" />
          <div className="h-4 bg-earth-100 rounded w-24 mt-3" />
        </div>
        <div className="h-6 bg-earth-100 rounded-full w-20" />
      </div>
    </div>
  )
}

export default function CustomerDashboardPage() {
  const { user } = useAuth()
  const { startTour, getChecklist, markChecklistItem } = useOnboarding()
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [confirmCancel, setConfirmCancel] = useState(null)
  const [page, setPage] = useState(1)
  const checklistItems = getChecklist('customer')
  const allChecklistDone = checklistItems.length > 0 && checklistItems.every(item => item.done)

  const fetchOrders = async (p = 1) => {
    setLoading(true)
    try {
      const res = await orderService.getMyOrders({ page: p, limit: 10 })
      const fetchedOrders = res.data.data.orders || []
      setOrders(fetchedOrders)
      setPagination(res.data.data.pagination || { page: 1, pages: 1, total: 0 })
      if (fetchedOrders.length > 0) {
        markChecklistItem('customer', 'first_order')
      }
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchOrders(page) }, [page])

  const handleCancel = async (id) => {
    setCancelling(id)
    setConfirmCancel(null)
    try {
      await orderService.cancelOrder(id)
      fetchOrders(page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel order')
    } finally { setCancelling(null) }
  }

  const activeOrders = orders.filter(o => !['completed', 'rejected', 'cancelled'].includes(o.status))
  const pastOrders   = orders.filter(o =>  ['completed', 'rejected', 'cancelled'].includes(o.status))

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
     <div className="bg-gradient-to-br from-brand-800 to-brand-900 pt-8 pb-20 px-4">
        <div className="container-page max-w-2xl">
          <div className="flex items-center justify-between gap-4" data-tour="customer-hero">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 bg-brand-500/20 border border-brand-500/30 rounded-2xl
                flex items-center justify-center flex-shrink-0 overflow-hidden">
                {user?.avatarURL ? (
                  <img src={user.avatarURL} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-brand-400 font-display font-bold text-xl">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-cream">
                  Hello, {user?.name?.split(' ')[0]}
                </h1>
                <p className="text-white/70 text-sm font-body mt-0.5">
                  {pagination.total} order{pagination.total !== 1 ? 's' : ''} placed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => startTour('customer', { force: true })}
                className="flex items-center gap-1.5 text-brand-200 hover:text-white text-xs font-body
                  transition-colors px-3 py-2 rounded-lg border border-brand-400/20 bg-brand-500/10 hover:bg-brand-500/20"
              >
                <Sparkles size={14} />
                Tour
              </button>
              <Link to="/profile"
                data-tour="customer-profile-link"
                className="flex items-center gap-1.5 text-white/70 hover:text-white
                  text-xs font-body transition-colors px-3 py-2 rounded-lg hover:bg-white/10">
                <UserCircle size={15} /> Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page max-w-2xl -mt-0 pb-12">
        {!allChecklistDone && (
          <div className="mb-6">
            <OnboardingChecklistCard
              eyebrow="Phase 3 Onboarding"
              title="Build your customer flow with confidence"
              description="This checklist helps first-time customers settle in quickly without getting lost. Each milestone unlocks naturally as they move through the app."
              items={checklistItems}
              actionLabel="Replay Tour"
              onAction={() => startTour('customer', { force: true })}
            />
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-earth-100 shadow-warm p-12 text-center">
            <div className="w-14 h-14 bg-earth-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag size={24} className="text-earth-300" />
            </div>
            <h3 className="font-display text-xl font-semibold text-earth-800 mb-2">No orders yet</h3>
            <p className="text-earth-600 text-sm font-body mb-6">
              Browse our catalogue and place your first order.
            </p>
            <Link to="/shop" className="btn-primary">Browse Products</Link>
          </div>
        ) : (
          <div className="space-y-6" data-tour="customer-orders-area">

            {/* Active orders */}
            {activeOrders.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className="text-brand-500" />
                  <p className="text-xs font-body font-semibold text-earth-800 uppercase tracking-wide">
                    Active Orders
                  </p>
                  <span className="bg-brand-100 text-brand-700 text-xs font-body font-bold
                    px-2 py-0.5 rounded-full">
                    {activeOrders.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {activeOrders.map(order => {
                    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                    return (
                      <div key={order._id}
                        className="bg-white rounded-2xl border border-earth-100 shadow-warm overflow-hidden">
                        <div className={`h-1 w-full ${cfg.stripe}`} />
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <p className="font-display font-bold text-brand-700 tracking-wide">
                                {order.orderRef}
                              </p>
                              <p className="text-earth-600 text-xs font-body mt-0.5">
                                {formatDate(order.createdAt)} · {timeAgo(order.createdAt)}
                              </p>
                            </div>
                            <StatusPill status={order.status} />
                          </div>

                          <p className="text-earth-700 text-sm font-body mb-1">
                            {order.orderItems?.length} item{order.orderItems?.length !== 1 ? 's' : ''}
                            {order.orderItems?.length > 0 && (
                              <> · {order.orderItems.slice(0, 2).map(i => i.productName).join(', ')}
                              {order.orderItems.length > 2 && ` +${order.orderItems.length - 2} more`}</>
                            )}
                          </p>

                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-earth-50">
                            <span className="font-display font-bold text-earth-900">
                              {formatKES(order.total)}
                            </span>
                            <div className="flex items-center gap-2">
                              {order.status === 'pending' && (
                                confirmCancel === order._id ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-earth-500 font-body flex items-center gap-1">
                                      <AlertTriangle size={11} className="text-amber-500" />
                                      Sure?
                                    </span>
                                    <button
                                      onClick={() => handleCancel(order._id)}
                                      disabled={cancelling === order._id}
                                      className="text-xs text-red-600 font-body font-semibold px-2 py-1
                                        rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
                                      {cancelling === order._id ? 'Cancelling…' : 'Yes'}
                                    </button>
                                    <button
                                      onClick={() => setConfirmCancel(null)}
                                      className="text-xs text-earth-500 font-body px-2 py-1
                                        rounded-lg hover:bg-earth-100 transition-colors">
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmCancel(order._id)}
                                    disabled={cancelling === order._id}
                                    className="text-xs text-red-500 hover:text-red-700 font-body
                                      font-medium px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                                    Cancel
                                  </button>
                                )
                              )}
                              <Link to={`/orders/${order._id}`}
                                className="flex items-center gap-1 text-xs text-brand-600
                                  hover:text-brand-700 font-body font-semibold px-2.5 py-1.5
                                  rounded-lg hover:bg-brand-50 transition-colors">
                                View <ChevronRight size={13} />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Past orders */}
            {pastOrders.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package size={14} className="text-earth-500" />
                  <p className="text-xs font-body font-semibold text-earth-700 uppercase tracking-wide">
                    Past Orders
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-earth-100 shadow-warm
                  divide-y divide-earth-50 overflow-hidden">
                  {pastOrders.map(order => (
                    <Link key={order._id} to={`/orders/${order._id}`}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-earth-50
                        transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-body font-semibold text-earth-700 text-sm">
                            {order.orderRef}
                          </span>
                          <StatusPill status={order.status} />
                        </div>
                        <p className="text-earth-600 text-xs font-body">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-body font-bold text-earth-800 text-sm">{formatKES(order.total)}</p>
                        <p className="text-earth-600 text-xs font-body">
                          {order.orderItems?.length} item{order.orderItems?.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <ChevronRight size={16}
                        className="text-earth-300 group-hover:text-earth-500 transition-colors flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}
                  className="px-4 py-2 text-sm font-body border border-earth-200 bg-white
                    rounded-xl text-earth-600 hover:bg-earth-50 disabled:opacity-40
                    disabled:cursor-not-allowed transition-colors">
                  ← Prev
                </button>
                <span className="text-sm font-body text-earth-700">{page} / {pagination.pages}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages}
                  className="px-4 py-2 text-sm font-body border border-earth-200 bg-white
                    rounded-xl text-earth-600 hover:bg-earth-50 disabled:opacity-40
                    disabled:cursor-not-allowed transition-colors">
                  Next →
                </button>
              </div>
            )}

            {/* Quick links */}
            <div className="flex gap-3">
              <Link to="/shop"
                data-tour="customer-browse-link"
                className="flex-1 text-center py-3 bg-brand-700 text-white rounded-xl
                  text-sm font-body font-medium hover:bg-brand-800 transition-colors">
                Browse Shop
              </Link>
              <Link to="/track"
                data-tour="customer-track-link"
                className="flex-1 text-center py-3 bg-white border border-earth-200 rounded-xl
                  text-sm font-body font-medium text-earth-800 hover:bg-earth-50 transition-colors">
                Track an Order
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
