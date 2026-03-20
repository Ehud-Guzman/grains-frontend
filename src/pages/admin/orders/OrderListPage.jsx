import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search, ChevronRight, Check, X, SlidersHorizontal,
  Clock, Package, Truck, CheckCircle, XCircle, RefreshCw
} from 'lucide-react'
import { adminOrderService } from '../../../services/admin/order.service'
import { formatKES, timeAgo, getStatusLabel } from '../../../utils/helpers'
import Spinner from '../../../components/ui/Spinner'
import toast from 'react-hot-toast'

// ── STATUS CONFIG ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:          { label: 'Pending',         dot: 'bg-amber-400',  badge: 'bg-amber-50  text-amber-700  border-amber-200'  },
  approved:         { label: 'Approved',        dot: 'bg-blue-400',   badge: 'bg-blue-50   text-blue-700   border-blue-200'   },
  preparing:        { label: 'Preparing',       dot: 'bg-purple-400', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  out_for_delivery: { label: 'Out for Delivery',dot: 'bg-brand-400',  badge: 'bg-brand-50  text-brand-700  border-brand-200'  },
  completed:        { label: 'Completed',       dot: 'bg-green-400',  badge: 'bg-green-50  text-green-700  border-green-200'  },
  rejected:         { label: 'Rejected',        dot: 'bg-red-400',    badge: 'bg-red-50    text-red-700    border-red-200'    },
  cancelled:        { label: 'Cancelled',       dot: 'bg-admin-300',  badge: 'bg-admin-50  text-admin-500  border-admin-200'  },
}

const STATUS_PILL_FILTERS = [
  { value: '',               label: 'All' },
  { value: 'pending',        label: 'Pending' },
  { value: 'approved',       label: 'Approved' },
  { value: 'preparing',      label: 'Preparing' },
  { value: 'out_for_delivery',label: 'Delivery' },
  { value: 'completed',      label: 'Completed' },
  { value: 'rejected',       label: 'Rejected' },
  { value: 'cancelled',      label: 'Cancelled' },
]

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-admin font-medium
      px-2.5 py-1 rounded-full border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ── SKELETON ROW ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-admin-50">
      <td className="px-4 py-4"><div className="w-4 h-4 bg-admin-100 rounded" /></td>
      <td className="px-4 py-4"><div className="h-4 bg-admin-100 rounded w-28" /></td>
      <td className="px-4 py-4 hidden sm:table-cell"><div className="h-4 bg-admin-100 rounded w-32" /></td>
      <td className="px-4 py-4 hidden md:table-cell"><div className="h-5 bg-admin-100 rounded-full w-16" /></td>
      <td className="px-4 py-4"><div className="h-5 bg-admin-100 rounded-full w-20" /></td>
      <td className="px-4 py-4 text-right"><div className="h-4 bg-admin-100 rounded w-20 ml-auto" /></td>
      <td className="px-4 py-4 hidden lg:table-cell"><div className="h-3 bg-admin-100 rounded w-16" /></td>
      <td className="px-4 py-4"><div className="w-6 h-6 bg-admin-100 rounded" /></td>
    </tr>
  )
}

export default function OrderListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const searchInputRef = useRef(null)

  const statusFilter = searchParams.get('status') || ''
  const searchQuery  = searchParams.get('search') || ''
  const page         = Number(searchParams.get('page')) || 1

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

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchOrders(true), 60000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  const setParam = (key, val) => {
    const p = new URLSearchParams(searchParams)
    if (val) p.set(key, val); else p.delete(key)
    p.delete('page')
    setSearchParams(p)
  }

  const toggleSelect = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const allSelected = orders.length > 0 && selected.length === orders.length

  const handleBulkApprove = async () => {
    setBulkLoading(true)
    try {
      const res = await adminOrderService.bulkApprove(selected)
      toast.success(`${res.data.data.approved.length} order(s) approved`)
      fetchOrders()
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
      setShowRejectModal(false)
      setRejectReason('')
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject orders')
    } finally { setBulkLoading(false) }
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-admin font-bold text-admin-900">Orders</h1>
          <p className="text-admin-400 text-xs font-admin mt-0.5">
            {pagination.total} total
            {pendingCount > 0 && (
              <span className="ml-2 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                {pendingCount} pending
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => fetchOrders(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-admin-200 rounded-lg
            text-sm font-admin text-admin-600 hover:bg-admin-50 transition-colors shadow-admin"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ── Status pills ───────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap mb-4">
        {STATUS_PILL_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setParam('status', f.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-admin font-semibold
              transition-all border ${
                statusFilter === f.value
                  ? 'bg-admin-900 text-white border-admin-900 shadow-sm'
                  : 'bg-white text-admin-500 border-admin-200 hover:border-admin-400 hover:text-admin-700'
              }`}
          >
            {f.label}
            {f.value === 'pending' && pendingCount > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                statusFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Search ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-3 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-admin-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by order ref, customer name or phone…"
            defaultValue={searchQuery}
            onKeyDown={e => e.key === 'Enter' && setParam('search', e.target.value)}
            onBlur={e => {
              if (e.target.value !== searchQuery) setParam('search', e.target.value)
            }}
            className="w-full pl-9 pr-4 py-2.5 border border-admin-200 rounded-lg text-sm
              font-admin text-admin-800 placeholder-admin-400 focus:outline-none
              focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all bg-admin-50"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setParam('search', '')
                if (searchInputRef.current) searchInputRef.current.value = ''
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full
                hover:bg-admin-200 text-admin-400 transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Bulk action bar ────────────────────────────────────────────── */}
      {selected.length > 0 && (
        <div className="bg-brand-900 rounded-xl px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-brand-500 rounded flex items-center justify-center">
              <Check size={11} className="text-white" />
            </div>
            <span className="text-white text-sm font-admin font-medium">
              {selected.length} order{selected.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleBulkApprove}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg
                text-sm font-admin font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              <Check size={14} /> Approve All
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-lg
                text-sm font-admin font-semibold hover:bg-red-600 transition-colors"
            >
              <X size={14} /> Reject All
            </button>
            <button
              onClick={() => setSelected([])}
              className="p-2 rounded-lg text-admin-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-admin">
            <thead>
              <tr className="border-b border-admin-100 bg-admin-50/60">
                <th className="w-10 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? [] : orders.map(o => o._id))}
                    className="rounded border-admin-300 text-brand-500 focus:ring-brand-400 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5 text-left text-xs text-admin-500 font-semibold uppercase tracking-wide">
                  Order
                </th>
                <th className="px-4 py-3.5 text-left text-xs text-admin-500 font-semibold uppercase tracking-wide hidden sm:table-cell">
                  Customer
                </th>
                <th className="px-4 py-3.5 text-left text-xs text-admin-500 font-semibold uppercase tracking-wide hidden md:table-cell">
                  Payment
                </th>
                <th className="px-4 py-3.5 text-left text-xs text-admin-500 font-semibold uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3.5 text-right text-xs text-admin-500 font-semibold uppercase tracking-wide">
                  Total
                </th>
                <th className="px-4 py-3.5 text-xs text-admin-500 font-semibold uppercase tracking-wide hidden lg:table-cell">
                  Time
                </th>
                <th className="w-10 px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package size={28} className="text-admin-300" />
                      <p className="text-admin-500 font-admin font-medium">No orders found</p>
                      <p className="text-admin-400 text-xs">
                        {statusFilter || searchQuery ? 'Try adjusting your filters' : 'Orders will appear here when customers place them'}
                      </p>
                      {(statusFilter || searchQuery) && (
                        <button
                          onClick={() => setSearchParams({})}
                          className="mt-2 text-xs text-brand-600 hover:underline font-admin"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr
                    key={order._id}
                    className={`hover:bg-admin-50/60 transition-colors group ${
                      selected.includes(order._id) ? 'bg-brand-50/40' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selected.includes(order._id)}
                        onChange={() => toggleSelect(order._id)}
                        className="rounded border-admin-300 text-brand-500 focus:ring-brand-400 cursor-pointer"
                      />
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="font-admin font-bold text-admin-800 tracking-wide">
                        {order.orderRef}
                      </p>
                      <p className="text-admin-400 text-xs mt-0.5 sm:hidden">
                        {order.userId?.name || order.guestId?.name || 'Guest'}
                      </p>
                    </td>

                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <p className="text-admin-700 font-admin font-medium">
                        {order.userId?.name || order.guestId?.name || 'Guest'}
                      </p>
                      {(order.userId?.phone || order.guestId?.phone) && (
                        <p className="text-admin-400 text-xs mt-0.5">
                          {order.userId?.phone || order.guestId?.phone}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className={`inline-flex items-center text-xs font-admin font-semibold
                        px-2.5 py-1 rounded-full border ${
                          order.paymentStatus === 'paid'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                        {order.paymentStatus === 'paid' ? '✓ Paid' : 'Pending'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <StatusBadge status={order.status} />
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <span className="font-admin font-bold text-admin-800">
                        {formatKES(order.total)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-admin-400 text-xs font-admin">
                        {timeAgo(order.createdAt)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <Link
                        to={`/admin/orders/${order._id}`}
                        className="flex items-center justify-center w-7 h-7 rounded-lg
                          text-admin-300 hover:text-admin-700 hover:bg-admin-100
                          opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer with pagination */}
        {!loading && orders.length > 0 && (
          <div className="px-4 py-3 border-t border-admin-100 flex items-center justify-between bg-admin-50/40">
            <p className="text-xs font-admin text-admin-400">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
            </p>
            {pagination.pages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setParam('page', page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-xs font-admin border border-admin-200 rounded-lg
                    text-admin-600 hover:bg-admin-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                <span className="px-3 py-1.5 text-xs font-admin text-admin-500">
                  {page} / {pagination.pages}
                </span>
                <button
                  onClick={() => setParam('page', page + 1)}
                  disabled={page >= pagination.pages}
                  className="px-3 py-1.5 text-xs font-admin border border-admin-200 rounded-lg
                    text-admin-600 hover:bg-admin-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bulk reject modal ───────────────────────────────────────────── */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-admin-lg border border-admin-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <XCircle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-admin font-bold text-admin-900">Reject {selected.length} Orders</h3>
                <p className="text-admin-400 text-xs mt-0.5">This action will notify affected customers</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-admin font-semibold text-admin-600
                uppercase tracking-wide mb-1.5">
                Rejection Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Products out of stock, delivery unavailable in your area…"
                rows={3}
                autoFocus
                className="w-full border border-admin-200 rounded-xl px-3.5 py-2.5 text-sm
                  font-admin text-admin-800 focus:outline-none focus:ring-2
                  focus:ring-red-300 focus:border-transparent resize-none bg-admin-50"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkReject}
                disabled={bulkLoading || !rejectReason.trim()}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-admin
                  font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {bulkLoading ? 'Rejecting…' : 'Confirm Reject'}
              </button>
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason('') }}
                className="flex-1 py-2.5 border border-admin-200 text-admin-600 rounded-xl
                  text-sm font-admin font-semibold hover:bg-admin-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}