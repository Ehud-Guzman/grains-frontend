import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield, Search, Filter, ChevronRight, LogIn, LogOut,
  ShoppingCart, Package, Layers, CreditCard, Users, RefreshCw
} from 'lucide-react'
import { adminLogService } from '../../../services/admin/log.service'
import { formatDateTime, timeAgo } from '../../../utils/helpers'
import Spinner from '../../../components/ui/Spinner'
import Pagination from '../../../components/ui/Pagination'

// ── ACTION CONFIG ─────────────────────────────────────────────────────────────
const ACTION_CONFIG = {
  // Auth
  ADMIN_LOGIN:              { label: 'Admin Login',          icon: LogIn,       color: 'blue',   category: 'auth' },
  ADMIN_LOGOUT:             { label: 'Admin Logout',         icon: LogOut,      color: 'slate',  category: 'auth' },
  CUSTOMER_LOGIN:           { label: 'Customer Login',       icon: LogIn,       color: 'slate',  category: 'auth' },
  FAILED_LOGIN:             { label: 'Failed Login Attempt', icon: Shield,      color: 'red',    category: 'auth' },
  // Orders
  ORDER_CREATED:            { label: 'Order Created',        icon: ShoppingCart, color: 'blue',  category: 'order' },
  ORDER_APPROVED:           { label: 'Order Approved',       icon: ShoppingCart, color: 'green', category: 'order' },
  ORDER_REJECTED:           { label: 'Order Rejected',       icon: ShoppingCart, color: 'red',   category: 'order' },
  ORDER_STATUS_CHANGED:     { label: 'Order Status Changed', icon: ShoppingCart, color: 'amber', category: 'order' },
  ORDER_CANCELLED:          { label: 'Order Cancelled',      icon: ShoppingCart, color: 'slate', category: 'order' },
  // Products
  PRODUCT_ADDED:            { label: 'Product Added',        icon: Package,     color: 'green',  category: 'product' },
  PRODUCT_EDITED:           { label: 'Product Edited',       icon: Package,     color: 'amber',  category: 'product' },
  PRODUCT_DELETED:          { label: 'Product Deleted',      icon: Package,     color: 'red',    category: 'product' },
  PRODUCT_ACTIVATED:        { label: 'Product Activated',    icon: Package,     color: 'green',  category: 'product' },
  PRODUCT_DEACTIVATED:      { label: 'Product Deactivated',  icon: Package,     color: 'slate',  category: 'product' },
  // Stock
  STOCK_DELIVERY_ADDED:     { label: 'Stock Delivery Added', icon: Layers,      color: 'green',  category: 'stock' },
  STOCK_MANUALLY_ADJUSTED:  { label: 'Stock Adjusted',       icon: Layers,      color: 'amber',  category: 'stock' },
  STOCK_DEDUCTED_BY_ORDER:  { label: 'Stock Deducted',       icon: Layers,      color: 'blue',   category: 'stock' },
  // Payments
  PAYMENT_CONFIRMED:        { label: 'Payment Confirmed',    icon: CreditCard,  color: 'green',  category: 'payment' },
  PAYMENT_FAILED:           { label: 'Payment Failed',       icon: CreditCard,  color: 'red',    category: 'payment' },
  PAYMENT_MANUALLY_CONFIRMED:{ label: 'Payment Manual Confirm', icon: CreditCard, color: 'amber', category: 'payment' },
  PAYMENT_REFUNDED:         { label: 'Payment Refunded',     icon: CreditCard,  color: 'red',    category: 'payment' },
  // Accounts
  ADMIN_CREATED:            { label: 'Admin Account Created', icon: Users,      color: 'blue',   category: 'account' },
  ADMIN_ROLE_CHANGED:       { label: 'Role Changed',         icon: Users,       color: 'amber',  category: 'account' },
  CUSTOMER_ACCOUNT_LOCKED:  { label: 'Account Locked',       icon: Users,       color: 'red',    category: 'account' },
  CUSTOMER_ACCOUNT_UNLOCKED:{ label: 'Account Unlocked',     icon: Users,       color: 'green',  category: 'account' },
}

const CATEGORIES = [
  { value: '', label: 'All Events' },
  { value: 'auth', label: 'Authentication' },
  { value: 'order', label: 'Orders' },
  { value: 'product', label: 'Products' },
  { value: 'stock', label: 'Stock' },
  { value: 'payment', label: 'Payments' },
  { value: 'account', label: 'Accounts' },
]

const COLOR_CLASSES = {
  blue:  { bg: 'bg-blue-50',  text: 'text-blue-600',  badge: 'bg-blue-100 text-blue-700' },
  green: { bg: 'bg-green-50', text: 'text-green-600', badge: 'bg-green-100 text-green-700' },
  red:   { bg: 'bg-red-50',   text: 'text-red-600',   badge: 'bg-red-100 text-red-700' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  slate: { bg: 'bg-admin-50', text: 'text-admin-500', badge: 'bg-admin-100 text-admin-600' },
}

// ── LOG ENTRY ROW ─────────────────────────────────────────────────────────────
function LogRow({ log }) {
  const config = ACTION_CONFIG[log.action] || {
    label: log.action,
    icon: Shield,
    color: 'slate',
  }
  const colors = COLOR_CLASSES[config.color] || COLOR_CLASSES.slate
  const Icon = config.icon

  const actorName = log.actorId?.name || 'System'
  const actorRole = log.actorRole || ''

  // Build a human-readable detail string
  const getDetail = () => {
    const d = log.detail || {}
    if (log.action === 'ORDER_APPROVED' || log.action === 'ORDER_REJECTED' || log.action === 'ORDER_STATUS_CHANGED') {
      return d.orderRef || d.newStatus || ''
    }
    if (log.action === 'PRODUCT_ADDED' || log.action === 'PRODUCT_EDITED' || log.action === 'PRODUCT_DELETED') {
      return d.productName || d.name || ''
    }
    if (log.action === 'STOCK_DELIVERY_ADDED' || log.action === 'STOCK_MANUALLY_ADJUSTED') {
      return d.productName ? `${d.productName} ${d.varietyName || ''} ${d.packagingSize || ''}`.trim() : ''
    }
    if (log.action === 'FAILED_LOGIN') {
      return d.phone || d.ip || ''
    }
    if (log.action === 'ADMIN_ROLE_CHANGED') {
      return d.newRole ? `→ ${d.newRole}` : ''
    }
    if (log.action === 'ADMIN_CREATED') {
      return d.targetName || ''
    }
    return ''
  }

  const detail = getDetail()

  return (
    <div className="flex items-start gap-4 px-5 py-3.5 hover:bg-admin-50 transition-colors border-b border-admin-50 last:border-0">
      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${colors.bg}`}>
        <Icon size={15} className={colors.text} />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-admin font-semibold text-admin-800 text-sm">{config.label}</span>
          {detail && (
            <span className="text-admin-500 text-xs font-admin truncate max-w-[200px]">{detail}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-admin-500 text-xs font-admin">
            By <span className="font-medium text-admin-700">{actorName}</span>
            {actorRole && <span className="text-admin-400"> ({actorRole})</span>}
          </span>
          {log.ip && (
            <span className="text-admin-300 text-xs font-admin hidden sm:inline">{log.ip}</span>
          )}
        </div>
      </div>

      {/* Target link */}
      {log.targetId && log.targetType === 'Order' && (
        <Link
          to={`/admin/orders/${log.targetId}`}
          className="text-brand-600 hover:text-brand-700 p-1 rounded-lg hover:bg-brand-50 transition-colors flex-shrink-0"
          title="View order"
        >
          <ChevronRight size={15} />
        </Link>
      )}

      {/* Timestamp */}
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-admin text-admin-400" title={formatDateTime(log.timestamp)}>
          {timeAgo(log.timestamp)}
        </p>
        <p className="text-xs font-admin text-admin-300 mt-0.5 hidden sm:block">
          {formatDateTime(log.timestamp).split(',')[0]}
        </p>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ActivityLogPage() {
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Get all action keys for a category
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
      if (actions) params.actions = actions
      if (dateFrom) params.from = dateFrom
      if (dateTo) params.to = dateTo
      const res = await adminLogService.getLogs(params)
      setLogs(res.data.data.logs || res.data.data)
      setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 })
    } catch {}
    finally { setLoading(false) }
  }, [page, category, dateFrom, dateTo])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Auto-refresh every 30s if enabled
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchLogs, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchLogs])

  const handleCategoryChange = (cat) => {
    setCategory(cat)
    setPage(1)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-admin font-bold text-admin-900">Activity Log</h1>
          <p className="text-admin-400 text-sm mt-0.5">
            Complete audit trail — {pagination.total} events recorded
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-admin text-admin-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded border-admin-300 text-brand-500 focus:ring-brand-400"
            />
            Live (30s)
          </label>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-admin-200 text-admin-600 hover:bg-admin-50 text-sm font-admin font-medium transition-colors shadow-admin"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap mb-4">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => handleCategoryChange(cat.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-admin font-medium transition-colors ${
              category === cat.value
                ? 'bg-brand-500 text-white'
                : 'bg-white border border-admin-200 text-admin-600 hover:bg-admin-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Date filters */}
      <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-admin font-medium text-admin-500 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="w-full border border-admin-200 rounded-lg px-3 py-2 text-sm font-admin text-admin-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-admin font-medium text-admin-500 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="w-full border border-admin-200 rounded-lg px-3 py-2 text-sm font-admin text-admin-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          {(dateFrom || dateTo || category) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setCategory(''); setPage(1) }}
              className="px-4 py-2 border border-admin-200 rounded-lg text-sm font-admin text-admin-600 hover:bg-admin-50 transition-colors whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Log list */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-admin-200 p-12 text-center">
          <Shield size={32} className="text-admin-300 mx-auto mb-3" />
          <p className="text-admin-500 font-admin font-medium">No activity found</p>
          <p className="text-admin-400 text-sm font-admin mt-1">
            {category || dateFrom || dateTo ? 'Try adjusting your filters' : 'Activity will appear here as the system is used'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden">
          {/* Stats bar */}
          <div className="px-5 py-3 border-b border-admin-100 bg-admin-50 flex items-center justify-between">
            <span className="text-xs font-admin text-admin-500">
              Showing {logs.length} of {pagination.total} events
            </span>
            <span className="text-xs font-admin text-admin-400">
              Read-only — no log can be edited or deleted
            </span>
          </div>

          {/* Rows */}
          <div>
            {logs.map(log => (
              <LogRow key={log._id} log={log} />
            ))}
          </div>
        </div>
      )}

      <Pagination page={page} pages={pagination.pages} onPage={setPage} />
    </div>
  )
}