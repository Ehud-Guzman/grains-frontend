import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield, ChevronRight, LogIn, LogOut,
  ShoppingCart, Package, Layers, CreditCard, Users, RefreshCw, X
} from 'lucide-react'
import { adminLogService } from '../../../services/admin/log.service'
import { formatDateTime, timeAgo } from '../../../utils/helpers'
import Spinner from '../../../components/ui/Spinner'

// ── ACTION CONFIG ─────────────────────────────────────────────────────────────
const ACTION_CONFIG = {
  ADMIN_LOGIN:               { label: 'Admin Login',            icon: LogIn,        color: 'blue',   category: 'auth'    },
  ADMIN_LOGOUT:              { label: 'Admin Logout',           icon: LogOut,       color: 'slate',  category: 'auth'    },
  CUSTOMER_LOGIN:            { label: 'Customer Login',         icon: LogIn,        color: 'slate',  category: 'auth'    },
  FAILED_LOGIN:              { label: 'Failed Login',           icon: Shield,       color: 'red',    category: 'auth'    },
  PASSWORD_CHANGED:          { label: 'Password Changed',       icon: Shield,       color: 'amber',  category: 'auth'    },
  ORDER_CREATED:             { label: 'Order Created',          icon: ShoppingCart, color: 'blue',   category: 'order'   },
  ORDER_APPROVED:            { label: 'Order Approved',         icon: ShoppingCart, color: 'green',  category: 'order'   },
  ORDER_REJECTED:            { label: 'Order Rejected',         icon: ShoppingCart, color: 'red',    category: 'order'   },
  ORDER_STATUS_CHANGED:      { label: 'Status Changed',         icon: ShoppingCart, color: 'amber',  category: 'order'   },
  ORDER_CANCELLED:           { label: 'Order Cancelled',        icon: ShoppingCart, color: 'slate',  category: 'order'   },
  PRODUCT_ADDED:             { label: 'Product Added',          icon: Package,      color: 'green',  category: 'product' },
  PRODUCT_EDITED:            { label: 'Product Edited',         icon: Package,      color: 'amber',  category: 'product' },
  PRODUCT_DELETED:           { label: 'Product Deleted',        icon: Package,      color: 'red',    category: 'product' },
  PRODUCT_ACTIVATED:         { label: 'Product Activated',      icon: Package,      color: 'green',  category: 'product' },
  PRODUCT_DEACTIVATED:       { label: 'Product Deactivated',    icon: Package,      color: 'slate',  category: 'product' },
  STOCK_DELIVERY_ADDED:      { label: 'Stock Delivery',         icon: Layers,       color: 'green',  category: 'stock'   },
  STOCK_MANUALLY_ADJUSTED:   { label: 'Stock Adjusted',         icon: Layers,       color: 'amber',  category: 'stock'   },
  STOCK_DEDUCTED_BY_ORDER:   { label: 'Stock Deducted',         icon: Layers,       color: 'blue',   category: 'stock'   },
  PAYMENT_CONFIRMED:         { label: 'Payment Confirmed',      icon: CreditCard,   color: 'green',  category: 'payment' },
  PAYMENT_FAILED:            { label: 'Payment Failed',         icon: CreditCard,   color: 'red',    category: 'payment' },
  PAYMENT_MANUALLY_CONFIRMED:{ label: 'Manual Payment Confirm', icon: CreditCard,   color: 'amber',  category: 'payment' },
  PAYMENT_REFUNDED:          { label: 'Payment Refunded',       icon: CreditCard,   color: 'red',    category: 'payment' },
  ADMIN_CREATED:             { label: 'Admin Created',          icon: Users,        color: 'blue',   category: 'account' },
  ADMIN_ROLE_CHANGED:        { label: 'Role Changed',           icon: Users,        color: 'amber',  category: 'account' },
  CUSTOMER_ACCOUNT_LOCKED:   { label: 'Account Locked',         icon: Users,        color: 'red',    category: 'account' },
  CUSTOMER_ACCOUNT_UNLOCKED: { label: 'Account Unlocked',       icon: Users,        color: 'green',  category: 'account' },
  PROFILE_UPDATED:           { label: 'Profile Updated',        icon: Users,        color: 'blue',   category: 'account' },
}

const CATEGORIES = [
  { value: '',        label: 'All Events'     },
  { value: 'auth',    label: 'Authentication' },
  { value: 'order',   label: 'Orders'         },
  { value: 'product', label: 'Products'       },
  { value: 'stock',   label: 'Stock'          },
  { value: 'payment', label: 'Payments'       },
  { value: 'account', label: 'Accounts'       },
]

const COLOR_CLASSES = {
  blue:  { bg: 'bg-blue-50',   text: 'text-blue-600'  },
  green: { bg: 'bg-green-50',  text: 'text-green-600' },
  red:   { bg: 'bg-red-50',    text: 'text-red-600'   },
  amber: { bg: 'bg-amber-50',  text: 'text-amber-600' },
  slate: { bg: 'bg-admin-100', text: 'text-admin-500' },
}

// ── LOG ROW ───────────────────────────────────────────────────────────────────
function LogRow({ log }) {
  const config = ACTION_CONFIG[log.action] || { label: log.action, icon: Shield, color: 'slate' }
  const colors = COLOR_CLASSES[config.color] || COLOR_CLASSES.slate
  const Icon = config.icon
  const actorName = log.actorId?.name || 'System'

  const getDetail = () => {
    const d = log.detail || {}
    if (['ORDER_APPROVED','ORDER_REJECTED','ORDER_STATUS_CHANGED'].includes(log.action))
      return d.orderRef || d.newStatus || ''
    if (['PRODUCT_ADDED','PRODUCT_EDITED','PRODUCT_DELETED'].includes(log.action))
      return d.productName || d.name || ''
    if (['STOCK_DELIVERY_ADDED','STOCK_MANUALLY_ADJUSTED'].includes(log.action))
      return d.productName ? `${d.productName} ${d.varietyName || ''}`.trim() : ''
    if (log.action === 'FAILED_LOGIN') return d.phone || ''
    if (log.action === 'ADMIN_ROLE_CHANGED') return d.newRole ? `→ ${d.newRole}` : ''
    if (log.action === 'ADMIN_CREATED') return d.targetName || ''
    return ''
  }

  const detail = getDetail()

  return (
    <div className="flex items-start gap-3 px-5 py-4 hover:bg-admin-50/60
      transition-colors border-b border-admin-50 last:border-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center
        flex-shrink-0 mt-0.5 ${colors.bg}`}>
        <Icon size={14} className={colors.text} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-admin font-semibold text-admin-800 text-sm">
            {config.label}
          </span>
          {detail && (
            <span className="text-admin-400 text-xs font-admin truncate max-w-[180px]">
              {detail}
            </span>
          )}
        </div>
        <p className="text-admin-400 text-xs font-admin mt-0.5">
          By <span className="font-medium text-admin-600">{actorName}</span>
          {log.actorRole && (
            <span className="text-admin-300"> · {log.actorRole}</span>
          )}
          {log.ip && (
            <span className="text-admin-300 hidden sm:inline"> · {log.ip}</span>
          )}
        </p>
      </div>

      {log.targetId && log.targetType === 'Order' && (
        <Link to={`/admin/orders/${log.targetId}`}
          className="text-brand-500 hover:text-brand-700 p-1 rounded-lg
            hover:bg-brand-50 transition-colors flex-shrink-0" title="View order">
          <ChevronRight size={14} />
        </Link>
      )}

      <div className="text-right flex-shrink-0 ml-2">
        <p className="text-xs font-admin text-admin-400" title={formatDateTime(log.timestamp)}>
          {timeAgo(log.timestamp)}
        </p>
        <p className="text-xs font-admin text-admin-300 mt-0.5 hidden sm:block">
          {new Date(log.timestamp).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 px-5 py-4 border-b border-admin-50 animate-pulse">
      <div className="w-8 h-8 bg-admin-100 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-admin-100 rounded w-40" />
        <div className="h-3 bg-admin-100 rounded w-28" />
      </div>
      <div className="h-3 bg-admin-100 rounded w-16" />
    </div>
  )
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function ActivityLogPage() {
  const [logs, setLogs]           = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading]     = useState(true)
  const [page, setPage]           = useState(1)
  const [category, setCategory]   = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)

  const getActionsForCategory = (cat) => {
    if (!cat) return undefined
    return Object.entries(ACTION_CONFIG)
      .filter(([, v]) => v.category === cat)
      .map(([k]) => k)
      .join(',')
  }

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 30 }
      const actions = getActionsForCategory(category)
      if (actions) params.action = actions  // ← singular 'action', comma-separated
      if (dateFrom) params.from = dateFrom
      if (dateTo)   params.to   = dateTo

      const res = await adminLogService.getLogs(params)
      // Response: res.data.data = { logs, total, page, pages, limit }
      const d = res.data.data
      setLogs(d.logs || [])
      setPagination({ page: d.page, pages: d.pages, total: d.total })
    } catch {}
    finally { setLoading(false) }
  }, [page, category, dateFrom, dateTo])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchLogs, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchLogs])

  const clearFilters = () => {
    setCategory('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const hasFilters = category || dateFrom || dateTo

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-admin font-bold text-admin-900">Activity Log</h1>
          <p className="text-admin-400 text-xs font-admin mt-0.5">
            {pagination.total} events recorded · read-only audit trail
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-admin text-admin-500
            cursor-pointer">
            <input type="checkbox" checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded border-admin-300 text-brand-500 focus:ring-brand-400" />
            Live
          </label>
          <button onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-admin-200
              rounded-lg text-sm font-admin text-admin-600 hover:bg-admin-50 transition-colors
              shadow-admin">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Category pills ─────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap mb-4">
        {CATEGORIES.map(cat => (
          <button key={cat.value} onClick={() => { setCategory(cat.value); setPage(1) }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-admin font-semibold
              border transition-all ${
                category === cat.value
                  ? 'bg-admin-900 text-orange-500 border-admin-900 shadow-sm'
                  : 'bg-white border-admin-200 text-admin-500 hover:border-admin-400 hover:text-admin-700'
              }`}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Date filters ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-admin font-semibold text-admin-500
              uppercase tracking-wide mb-1.5">From Date</label>
            <input type="date" value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="w-full border border-admin-200 rounded-lg px-3 py-2.5 text-sm
                font-admin text-admin-800 focus:outline-none focus:ring-2 focus:ring-brand-400
                focus:border-transparent bg-admin-50" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-admin font-semibold text-admin-500
              uppercase tracking-wide mb-1.5">To Date</label>
            <input type="date" value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="w-full border border-admin-200 rounded-lg px-3 py-2.5 text-sm
                font-admin text-admin-800 focus:outline-none focus:ring-2 focus:ring-brand-400
                focus:border-transparent bg-admin-50" />
          </div>
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-admin-200
                rounded-lg text-sm font-admin text-admin-600 hover:bg-admin-50 transition-colors
                whitespace-nowrap">
              <X size={13} /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Log list ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-admin-200 p-16 text-center">
          <Shield size={28} className="text-admin-300 mx-auto mb-3" />
          <p className="text-admin-600 font-admin font-semibold">No activity found</p>
          <p className="text-admin-400 text-sm font-admin mt-1">
            {hasFilters ? 'Try adjusting your filters' : 'Events appear here as the system is used'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden">
          <div className="px-5 py-3 border-b border-admin-100 bg-admin-50/50 flex items-center
            justify-between">
            <span className="text-xs font-admin text-admin-500">
              {logs.length} of {pagination.total} events
              {hasFilters && ' (filtered)'}
            </span>
          </div>
          <div>
            {logs.map(log => <LogRow key={log._id} log={log} />)}
          </div>
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────── */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}
            className="px-4 py-2 text-sm font-admin border border-admin-200 bg-white
              rounded-xl text-admin-600 hover:bg-admin-50 disabled:opacity-40 transition-colors">
            ← Prev
          </button>
          <span className="text-sm font-admin text-admin-500">
            {page} / {pagination.pages}
          </span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages}
            className="px-4 py-2 text-sm font-admin border border-admin-200 bg-white
              rounded-xl text-admin-600 hover:bg-admin-50 disabled:opacity-40 transition-colors">
            Next →
          </button>
        </div>
      )}
    </div>
  )
}