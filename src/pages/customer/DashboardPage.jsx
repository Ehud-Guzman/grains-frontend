import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, ChevronRight, XCircle, ShoppingBag, Clock, UserCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { orderService } from '../../services/order.service'
import { formatKES, formatDate, getStatusLabel, timeAgo } from '../../utils/helpers'
import Spinner from '../../components/ui/Spinner'

// ── STATUS CONFIG ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:          { dot: 'bg-amber-400',  text: 'text-amber-700',  badge: 'bg-amber-50  border-amber-200',  stripe: 'bg-amber-400'  },
  approved:         { dot: 'bg-blue-400',   text: 'text-blue-700',   badge: 'bg-blue-50   border-blue-200',   stripe: 'bg-blue-400'   },
  preparing:        { dot: 'bg-purple-400', text: 'text-purple-700', badge: 'bg-purple-50 border-purple-200', stripe: 'bg-purple-400' },
  out_for_delivery: { dot: 'bg-brand-400',  text: 'text-brand-700',  badge: 'bg-brand-50  border-brand-200',  stripe: 'bg-brand-400'  },
  completed:        { dot: 'bg-green-400',  text: 'text-green-700',  badge: 'bg-green-50  border-green-200',  stripe: 'bg-green-400'  },
  rejected:         { dot: 'bg-red-400',    text: 'text-red-700',    badge: 'bg-red-50    border-red-200',    stripe: 'bg-red-400'    },
  cancelled:        { dot: 'bg-earth-300',  text: 'text-earth-500',  badge: 'bg-earth-50  border-earth-200',  stripe: 'bg-earth-200'  },
}

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
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [page, setPage] = useState(1)

  const fetchOrders = async (p = 1) => {
    setLoading(true)
    try {
      const res = await orderService.getMyOrders({ page: p, limit: 10 })
      setOrders(res.data.data.orders || [])
      setPagination(res.data.data.pagination || { page: 1, pages: 1, total: 0 })
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchOrders(page) }, [page])

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this order?')) return
    setCancelling(id)
    try {
      await orderService.cancelOrder(id)
      fetchOrders(page)
    } catch (err) {
      alert(err.response?.data?.message || 'Could not cancel order')
    } finally { setCancelling(null) }
  }

  const activeOrders = orders.filter(o => !['completed', 'rejected', 'cancelled'].includes(o.status))
  const pastOrders   = orders.filter(o =>  ['completed', 'rejected', 'cancelled'].includes(o.status))

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
     <div className="bg-earth-900 pt-8 pb-20 px-4">
        <div className="container-page max-w-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
                <p className="text-earth-400 text-sm font-body mt-0.5">
                  {pagination.total} order{pagination.total !== 1 ? 's' : ''} placed
                </p>
              </div>
            </div>
            <Link to="/profile"
              className="flex items-center gap-1.5 text-earth-400 hover:text-cream
                text-xs font-body transition-colors px-3 py-2 rounded-lg hover:bg-earth-800">
              <UserCircle size={15} /> Profile
            </Link>
          </div>
        </div>
      </div>

      <div className="container-page max-w-2xl -mt-0 pb-12">

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
            <p className="text-earth-400 text-sm font-body mb-6">
              Browse our catalogue and place your first order.
            </p>
            <Link to="/shop" className="btn-primary">Browse Products</Link>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Active orders */}
            {activeOrders.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className="text-brand-500" />
                  <p className="text-xs font-body font-semibold text-earth-600 uppercase tracking-wide">
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
                              <p className="text-earth-400 text-xs font-body mt-0.5">
                                {formatDate(order.createdAt)} · {timeAgo(order.createdAt)}
                              </p>
                            </div>
                            <StatusPill status={order.status} />
                          </div>

                          <p className="text-earth-500 text-sm font-body mb-1">
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
                                <button onClick={() => handleCancel(order._id)}
                                  disabled={cancelling === order._id}
                                  className="text-xs text-red-500 hover:text-red-700 font-body
                                    font-medium px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                                  {cancelling === order._id ? 'Cancelling…' : 'Cancel'}
                                </button>
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
                  <Package size={14} className="text-earth-400" />
                  <p className="text-xs font-body font-semibold text-earth-500 uppercase tracking-wide">
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
                        <p className="text-earth-400 text-xs font-body">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-body font-bold text-earth-800 text-sm">{formatKES(order.total)}</p>
                        <p className="text-earth-400 text-xs font-body">
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
                <span className="text-sm font-body text-earth-500">{page} / {pagination.pages}</span>
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
                className="flex-1 text-center py-3 bg-earth-900 text-cream rounded-xl
                  text-sm font-body font-medium hover:bg-earth-800 transition-colors">
                Browse Shop
              </Link>
              <Link to="/track"
                className="flex-1 text-center py-3 bg-white border border-earth-200 rounded-xl
                  text-sm font-body font-medium text-earth-600 hover:bg-earth-50 transition-colors">
                Track an Order
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}