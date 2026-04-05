import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  Search, ChevronRight, Check, X, RefreshCw,
  Package, XCircle, Filter, ArrowUpDown
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useOnboarding } from '../../../context/OnboardingContext'
import { adminOrderService } from '../../../services/admin/order.service'
import ViewOnlyBanner from '../../../components/admin/ViewOnlyBanner'
import { ContextualTip } from '../../../components/onboarding/OnboardingEnhancements'
import { OnboardingReturnLink } from '../../../components/onboarding/OnboardingEnhancements'
import { formatKES, timeAgo } from '../../../utils/helpers'
import toast from 'react-hot-toast'

// ── STATUS CONFIG ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:          { label: 'Pending',         dot: 'bg-amber-400',  badge: 'bg-amber-50  text-amber-700  border-amber-200'  },
  approved:         { label: 'Approved',        dot: 'bg-blue-400',   badge: 'bg-blue-50   text-blue-700   border-blue-200'   },
  preparing:        { label: 'Preparing',       dot: 'bg-purple-400', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  out_for_delivery: { label: 'Out for Delivery',dot: 'bg-brand-400',  badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  completed:        { label: 'Completed',       dot: 'bg-green-400',  badge: 'bg-green-50  text-green-700  border-green-200'  },
  rejected:         { label: 'Rejected',        dot: 'bg-red-400',    badge: 'bg-red-50    text-red-700    border-red-200'    },
  cancelled:        { label: 'Cancelled',       dot: 'bg-admin-300',  badge: 'bg-admin-50  text-admin-500  border-admin-200'  },
}

const STATUS_FILTERS = [
  { value: '',                label: 'All'         },
  { value: 'pending',         label: 'Pending'     },
  { value: 'approved',        label: 'Approved'    },
  { value: 'preparing',       label: 'Preparing'   },
  { value: 'out_for_delivery',label: 'Delivery'    },
  { value: 'completed',       label: 'Completed'   },
  { value: 'rejected',        label: 'Rejected'    },
  { value: 'cancelled',       label: 'Cancelled'   },
]

// ── SUB-COMPONENTS ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-admin font-semibold
      px-2.5 py-1 rounded-full border whitespace-nowrap ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function PaymentBadge({ status }) {
  if (status === 'paid') return (
    <span className="inline-flex items-center gap-1 text-xs font-admin font-semibold
      px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
      <Check size={10} /> Paid
    </span>
  )
  if (status === 'failed') return (
    <span className="inline-flex items-center gap-1 text-xs font-admin font-semibold
      px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
      Failed
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-admin font-semibold
      px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      Pending
    </span>
  )
}

// ── SKELETON — TABLE ROW ──────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-admin-50">
      <td className="px-4 py-4 hidden sm:table-cell">
        <div className="w-4 h-4 bg-admin-100 rounded" />
      </td>
      <td className="px-4 py-4">
        <div className="h-4 bg-admin-100 rounded w-28 mb-1.5" />
        <div className="h-3 bg-admin-100 rounded w-20" />
      </td>
      <td className="px-4 py-4 hidden md:table-cell">
        <div className="h-4 bg-admin-100 rounded w-32 mb-1" />
        <div className="h-3 bg-admin-100 rounded w-24" />
      </td>
      <td className="px-4 py-4 hidden lg:table-cell">
        <div className="h-5 bg-admin-100 rounded-full w-16" />
      </td>
      <td className="px-4 py-4">
        <div className="h-5 bg-admin-100 rounded-full w-20" />
      </td>
      <td className="px-4 py-4 text-right">
        <div className="h-4 bg-admin-100 rounded w-20 ml-auto" />
      </td>
      <td className="px-4 py-4 hidden xl:table-cell">
        <div className="h-3 bg-admin-100 rounded w-16" />
      </td>
      <td className="px-4 py-4">
        <div className="w-6 h-6 bg-admin-100 rounded-lg" />
      </td>
    </tr>
  )
}

// ── SKELETON — MOBILE CARD ────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="animate-pulse p-4 border-b border-admin-50 last:border-0">
      <div className="flex items-start justify-between mb-2">
        <div className="h-4 bg-admin-100 rounded w-28" />
        <div className="h-5 bg-admin-100 rounded-full w-20" />
      </div>
      <div className="h-4 bg-admin-100 rounded w-36 mb-1" />
      <div className="flex items-center justify-between mt-2">
        <div className="h-5 bg-admin-100 rounded-full w-16" />
        <div className="h-4 bg-admin-100 rounded w-20" />
      </div>
    </div>
  )
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function OrderListPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'superadmin'
  const { dismissedTips, dismissTip, markChecklistItem, markMilestone } = useOnboarding()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [orders, setOrders]         = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected]     = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [searchInput, setSearchInput]   = useState(searchParams.get('search') || '')
  const [pendingTotal, setPendingTotal] = useState(0)
  const searchDebounce = useRef(null)

  const statusFilter = searchParams.get('status') || ''
  const searchQuery  = searchParams.get('search') || ''
  const page         = Number(searchParams.get('page')) || 1

  // ── FETCH ─────────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const params = { page, limit: 20 }
      if (statusFilter) params.status = statusFilter
      if (searchQuery)  params.search = searchQuery
      const res = await adminOrderService.getAll(params)
      setOrders(res.data.data || [])
      setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 })
      setSelected([])
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [page, statusFilter, searchQuery])

  // Fetch pending total separately for accurate badge
  const fetchPendingTotal = useCallback(async () => {
    try {
      const res = await adminOrderService.getAll({ status: 'pending', limit: 1 })
      setPendingTotal(res.data.pagination?.total || 0)
    } catch {}
  }, [])

  useEffect(() => {
    fetchOrders()
    fetchPendingTotal()
  }, [fetchOrders, fetchPendingTotal])

  useEffect(() => {
    const t = setInterval(() => { fetchOrders(true); fetchPendingTotal() }, 60000)
    return () => clearInterval(t)
  }, [fetchOrders, fetchPendingTotal])

  // ── SEARCH DEBOUNCE ───────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      const p = new URLSearchParams(searchParams)
      if (searchInput.trim()) p.set('search', searchInput.trim())
      else p.delete('search')
      p.delete('page')
      setSearchParams(p)
    }, 400)
    return () => clearTimeout(searchDebounce.current)
  }, [searchInput])

  const setParam = (key, val) => {
    const p = new URLSearchParams(searchParams)
    if (val) p.set(key, val); else p.delete(key)
    p.delete('page')
    setSearchParams(p)
  }

  const clearAll = () => {
    setSearchInput('')
    setSearchParams({})
  }

  // ── SELECTION ─────────────────────────────────────────────────────────────
  const toggleSelect = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  const allSelected = orders.length > 0 && selected.length === orders.length

  // ── BULK ACTIONS ──────────────────────────────────────────────────────────
  const handleBulkApprove = async () => {
    setBulkLoading(true)
    try {
      const res = await adminOrderService.bulkApprove(selected)
      markChecklistItem('admin', 'orders')
      markMilestone('admin-first-approval')
      toast.success(`${res.data.data.approved.length} order(s) approved`)
      fetchOrders(); fetchPendingTotal()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve orders')
    } finally { setBulkLoading(false) }
  }

  const handleBulkReject = async () => {
    if (!rejectReason.trim()) return toast.error('Rejection reason is required')
    setBulkLoading(true)
    try {
      const res = await adminOrderService.bulkReject(selected, rejectReason)
      toast.success(`${res.data.data.rejected.length} order(s) rejected`)
      setShowRejectModal(false); setRejectReason('')
      fetchOrders(); fetchPendingTotal()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject orders')
    } finally { setBulkLoading(false) }
  }

  const hasFilters = statusFilter || searchQuery
  const showOrdersTip = !dismissedTips['admin-orders-tip']

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="mb-3">
            <OnboardingReturnLink />
          </div>
          <h1 className="text-xl sm:text-2xl font-admin font-bold text-admin-900">Orders</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-admin-400 text-xs font-admin">
              {pagination.total} total
            </p>
            {pendingTotal > 0 && (
              <button onClick={() => setParam('status', 'pending')}
                className="bg-amber-100 text-amber-700 text-xs font-admin font-semibold
                  px-2 py-0.5 rounded-full hover:bg-amber-200 transition-colors">
                {pendingTotal} pending
              </button>
            )}
          </div>
        </div>
        <button onClick={() => { fetchOrders(true); fetchPendingTotal() }}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-admin-200
            rounded-xl text-sm font-admin text-admin-600 hover:bg-admin-50 transition-colors
            shadow-sm">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {isSuperAdmin && <ViewOnlyBanner />}

      {showOrdersTip && (
        <div className="mb-4">
          <ContextualTip
            tipId="admin-orders-tip"
            onDismiss={dismissTip}
            theme="admin"
            title="This queue is built for fast triage"
            body="Use the pending filter for urgent approvals, then select multiple orders when the same decision applies to several customers. Search, filters, and bulk actions are meant to work together."
          />
        </div>
      )}

      {/* ── Search ──────────────────────────────────────────────────── */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2
          text-admin-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search order ref, name or phone…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-white border border-admin-200 rounded-xl
            text-sm font-admin text-admin-800 placeholder-admin-400 focus:outline-none
            focus:ring-2 focus:ring-brand-400 focus:border-transparent shadow-sm transition-all"
        />
        {searchInput && (
          <button onClick={() => setSearchInput('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full
              hover:bg-admin-100 text-admin-400 transition-colors">
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Status pills ────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => setParam('status', f.value)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-admin
              font-semibold transition-all border ${
                statusFilter === f.value
                  ? 'bg-admin-900 text-orange-500 border-admin-900 shadow-sm'
                  : 'bg-white text-admin-500 border-admin-200 hover:border-admin-400 hover:text-admin-700'
              }`}>
            {f.label}
            {f.value === 'pending' && pendingTotal > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                statusFilter === 'pending'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {pendingTotal}
              </span>
            )}
          </button>
        ))}
        {hasFilters && (
          <button onClick={clearAll}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full
              text-xs font-admin font-semibold text-red-500 border border-red-200
              bg-red-50 hover:bg-red-100 transition-colors">
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {/* ── Bulk action bar ─────────────────────────────────────────── */}
      {!isSuperAdmin && selected.length > 0 && (
        <div className="bg-admin-900 rounded-xl px-4 py-3 mb-4 flex items-center
          gap-3 flex-wrap shadow-sm">
          <span className="text-white text-sm font-admin font-semibold">
            {selected.length} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={handleBulkApprove} disabled={bulkLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white
                rounded-lg text-sm font-admin font-semibold hover:bg-green-600
                disabled:opacity-50 transition-colors">
              <Check size={13} />
              <span>Approve</span>
            </button>
            <button onClick={() => setShowRejectModal(true)} disabled={bulkLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white
                rounded-lg text-sm font-admin font-semibold hover:bg-red-600 transition-colors">
              <X size={13} />
              <span>Reject</span>
            </button>
            <button onClick={() => setSelected([])}
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10
                transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── MOBILE CARD LIST (< md) ──────────────────────────────────── */}
      <div className="md:hidden bg-white rounded-xl border border-admin-200 shadow-sm
        overflow-hidden">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={28} className="text-admin-300 mx-auto mb-2" />
            <p className="text-admin-500 font-admin font-medium text-sm">No orders found</p>
            {hasFilters && (
              <button onClick={clearAll}
                className="mt-3 text-xs text-brand-600 font-admin underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          orders.map(order => {
            const customerName = order.userId?.name || order.guestId?.name || 'Guest'
            const customerPhone = order.userId?.phone || order.guestId?.phone || ''
            return (
              <div key={order._id}
                className={`border-b border-admin-50 last:border-0 transition-colors ${
                  selected.includes(order._id) ? 'bg-brand-50/40' : 'hover:bg-admin-50/50'
                }`}>
                {/* Full row tap → navigate */}
                <button className="w-full text-left p-4"
                  onClick={() => navigate(`/admin/orders/${order._id}`)}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {/* Checkbox — tap to select without navigating */}
                      {!isSuperAdmin && (
                        <div onClick={e => { e.stopPropagation(); toggleSelect(order._id) }}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center
                            flex-shrink-0 transition-all ${
                              selected.includes(order._id)
                                ? 'bg-brand-500 border-brand-500'
                                : 'border-admin-300'
                            }`}>
                          {selected.includes(order._id) && (
                            <Check size={10} className="text-white" />
                          )}
                        </div>
                      )}
                      <span className="font-admin font-bold text-admin-800 text-sm tracking-wide">
                        {order.orderRef}
                      </span>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-admin-700 font-admin font-medium text-sm">
                    {customerName}
                  </p>
                  {customerPhone && (
                    <p className="text-admin-400 text-xs font-admin mt-0.5">{customerPhone}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <PaymentBadge status={order.paymentStatus} />
                      <span className="text-admin-400 text-xs font-admin">
                        {timeAgo(order.createdAt)}
                      </span>
                    </div>
                    <span className="font-admin font-bold text-admin-800">
                      {formatKES(order.total)}
                    </span>
                  </div>
                </button>
              </div>
            )
          })
        )}

        {/* Mobile pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-admin-100 bg-admin-50/40
            flex items-center justify-between">
            <button onClick={() => setParam('page', page - 1)} disabled={page <= 1}
              className="px-4 py-2 text-xs font-admin border border-admin-200 rounded-lg
                text-admin-600 hover:bg-admin-100 disabled:opacity-40
                disabled:cursor-not-allowed transition-colors">
              ← Prev
            </button>
            <span className="text-xs font-admin text-admin-500">
              {page} / {pagination.pages}
            </span>
            <button onClick={() => setParam('page', page + 1)} disabled={page >= pagination.pages}
              className="px-4 py-2 text-xs font-admin border border-admin-200 rounded-lg
                text-admin-600 hover:bg-admin-100 disabled:opacity-40
                disabled:cursor-not-allowed transition-colors">
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── DESKTOP TABLE (≥ md) ─────────────────────────────────────── */}
      <div className="hidden md:block bg-white rounded-xl border border-admin-200
        shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-admin">
            <thead>
              <tr className="border-b border-admin-100 bg-admin-50/60">
                {!isSuperAdmin && (
                  <th className="w-10 px-4 py-3.5">
                    <input type="checkbox" checked={allSelected}
                      onChange={() => setSelected(allSelected ? [] : orders.map(o => o._id))}
                      className="rounded border-admin-300 text-brand-500
                        focus:ring-brand-400 cursor-pointer" />
                  </th>
                )}
                <th className="px-4 py-3.5 text-left text-xs text-admin-500 font-semibold
                  uppercase tracking-wide">Order</th>
                <th className="px-4 py-3.5 text-left text-xs text-admin-500 font-semibold
                  uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3.5 text-left text-xs text-admin-500 font-semibold
                  uppercase tracking-wide hidden lg:table-cell">Payment</th>
                <th className="px-4 py-3.5 text-left text-xs text-admin-500 font-semibold
                  uppercase tracking-wide">Status</th>
                <th className="px-4 py-3.5 text-right text-xs text-admin-500 font-semibold
                  uppercase tracking-wide">Total</th>
                <th className="px-4 py-3.5 text-xs text-admin-500 font-semibold
                  uppercase tracking-wide hidden xl:table-cell">Time</th>
                <th className="w-10 px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Package size={28} className="text-admin-300 mx-auto mb-2" />
                    <p className="text-admin-500 font-admin font-medium">No orders found</p>
                    <p className="text-admin-400 text-xs mt-1">
                      {hasFilters ? 'Try adjusting your filters' : 'Orders will appear here when customers place them'}
                    </p>
                    {hasFilters && (
                      <button onClick={clearAll}
                        className="mt-3 text-xs text-brand-600 hover:underline font-admin">
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                orders.map(order => {
                  const customerName = order.userId?.name || order.guestId?.name || 'Guest'
                  const customerPhone = order.userId?.phone || order.guestId?.phone || ''
                  return (
                    <tr key={order._id}
                      className={`hover:bg-admin-50/60 transition-colors group cursor-pointer ${
                        selected.includes(order._id) ? 'bg-brand-50/40' : ''
                      }`}
                      onClick={() => navigate(`/admin/orders/${order._id}`)}>

                      {!isSuperAdmin && (
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <input type="checkbox"
                            checked={selected.includes(order._id)}
                            onChange={() => toggleSelect(order._id)}
                            className="rounded border-admin-300 text-brand-500
                              focus:ring-brand-400 cursor-pointer" />
                        </td>
                      )}

                      <td className="px-4 py-3.5">
                        <p className="font-admin font-bold text-admin-800 tracking-wide">
                          {order.orderRef}
                        </p>
                        <p className="text-admin-400 text-xs mt-0.5">
                          {order.orderItems?.length || 0} item{order.orderItems?.length !== 1 ? 's' : ''}
                        </p>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="text-admin-700 font-admin font-medium">{customerName}</p>
                        {customerPhone && (
                          <p className="text-admin-400 text-xs mt-0.5">{customerPhone}</p>
                        )}
                      </td>

                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <PaymentBadge status={order.paymentStatus} />
                      </td>

                      <td className="px-4 py-3.5">
                        <StatusBadge status={order.status} />
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <span className="font-admin font-bold text-admin-800">
                          {formatKES(order.total)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 hidden xl:table-cell">
                        <span className="text-admin-400 text-xs font-admin">
                          {timeAgo(order.createdAt)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg
                          text-admin-300 group-hover:text-admin-700 group-hover:bg-admin-100
                          transition-all">
                          <ChevronRight size={16} />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Desktop pagination */}
        {!loading && orders.length > 0 && (
          <div className="px-4 py-3 border-t border-admin-100 flex items-center
            justify-between bg-admin-50/40">
            <p className="text-xs font-admin text-admin-400 hidden sm:block">
              {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
            </p>
            {pagination.pages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setParam('page', page - 1)} disabled={page <= 1}
                  className="px-3 py-1.5 text-xs font-admin border border-admin-200 rounded-lg
                    text-admin-600 hover:bg-admin-100 disabled:opacity-40
                    disabled:cursor-not-allowed transition-colors">
                  ← Prev
                </button>
                <span className="px-3 py-1.5 text-xs font-admin text-admin-500">
                  {page} / {pagination.pages}
                </span>
                <button onClick={() => setParam('page', page + 1)} disabled={page >= pagination.pages}
                  className="px-3 py-1.5 text-xs font-admin border border-admin-200 rounded-lg
                    text-admin-600 hover:bg-admin-100 disabled:opacity-40
                    disabled:cursor-not-allowed transition-colors">
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bulk reject modal ────────────────────────────────────────── */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50
          flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6
            shadow-2xl border-t sm:border border-admin-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center
                justify-center flex-shrink-0">
                <XCircle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-admin font-bold text-admin-900">
                  Reject {selected.length} Order{selected.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-admin-400 text-xs mt-0.5">
                  Customers will be notified with this reason
                </p>
              </div>
            </div>
            <label className="block text-xs font-admin font-semibold text-admin-600
              uppercase tracking-wide mb-1.5">
              Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Products out of stock, delivery unavailable…"
              rows={3} autoFocus
              className="w-full border border-admin-200 rounded-xl px-3.5 py-2.5 text-sm
                font-admin text-admin-800 focus:outline-none focus:ring-2
                focus:ring-red-300 focus:border-transparent resize-none bg-admin-50 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={handleBulkReject}
                disabled={bulkLoading || !rejectReason.trim()}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-admin
                  font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                {bulkLoading ? 'Rejecting…' : 'Confirm Reject'}
              </button>
              <button onClick={() => { setShowRejectModal(false); setRejectReason('') }}
                className="flex-1 py-3 border border-admin-200 text-admin-600 rounded-xl
                  text-sm font-admin font-semibold hover:bg-admin-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
