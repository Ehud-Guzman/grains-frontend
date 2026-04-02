import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart, TrendingUp, DollarSign, Package, AlertTriangle,
  Clock, ChevronRight, RefreshCw, CheckCircle, ArrowUpRight, Sparkles
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useOnboarding } from '../../context/OnboardingContext'
import { adminReportService } from '../../services/admin/report.service'
import { adminStockService } from '../../services/admin/stock.service'
import { OnboardingChecklistCard } from '../../components/onboarding/OnboardingEnhancements'
import { formatKES, timeAgo, getStatusLabel } from '../../utils/helpers'
import Spinner from '../../components/ui/Spinner'

// ── STATUS CONFIG ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:          { dot: 'bg-amber-400',  text: 'text-amber-700',  badge: 'bg-amber-50  border-amber-200'  },
  approved:         { dot: 'bg-blue-400',   text: 'text-blue-700',   badge: 'bg-blue-50   border-blue-200'   },
  preparing:        { dot: 'bg-purple-400', text: 'text-purple-700', badge: 'bg-purple-50 border-purple-200' },
  out_for_delivery: { dot: 'bg-brand-400',  text: 'text-brand-700',  badge: 'bg-brand-50  border-brand-200'  },
  completed:        { dot: 'bg-green-400',  text: 'text-green-700',  badge: 'bg-green-50  border-green-200'  },
  rejected:         { dot: 'bg-red-400',    text: 'text-red-700',    badge: 'bg-red-50    border-red-200'    },
  cancelled:        { dot: 'bg-admin-300',  text: 'text-admin-500',  badge: 'bg-admin-50  border-admin-200'  },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-admin font-semibold
      px-2.5 py-1 rounded-full border ${cfg.badge} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {getStatusLabel(status)}
    </span>
  )
}

// ── KPI CARD ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color, badge, link }) {
  const colorMap = {
    blue:  { icon: 'bg-blue-50 text-blue-600',   border: 'border-blue-100'   },
    amber: { icon: 'bg-amber-50 text-amber-600',  border: 'border-amber-100'  },
    green: { icon: 'bg-green-50 text-green-600',  border: 'border-green-100'  },
    brand: { icon: 'bg-brand-50 text-brand-600',  border: 'border-brand-100'  },
    red:   { icon: 'bg-red-50 text-red-600',      border: 'border-red-100'    },
  }[color] || { icon: 'bg-admin-100 text-admin-600', border: 'border-admin-200' }

  const inner = (
    <div className={`bg-white rounded-xl border shadow-admin p-4 hover:shadow-admin-lg
      transition-all ${colorMap.border} ${link ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap.icon}`}>
          <Icon size={18} />
        </div>
        {badge > 0 && (
          <span className={`text-xs font-admin font-bold px-2 py-0.5 rounded-full ${
            color === 'red' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {badge}
          </span>
        )}
      </div>
      <p className="font-admin font-bold text-admin-900 text-xl leading-tight">{value}</p>
      <p className="text-admin-400 text-xs font-admin mt-1">{label}</p>
      {sub && <p className="text-admin-300 text-xs font-admin mt-0.5">{sub}</p>}
    </div>
  )

  return link ? <Link to={link}>{inner}</Link> : inner
}

// ── SKELETON ──────────────────────────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-admin-100 shadow-admin p-4 animate-pulse">
      <div className="w-9 h-9 bg-admin-100 rounded-xl mb-3" />
      <div className="h-6 bg-admin-100 rounded w-20 mb-1" />
      <div className="h-3 bg-admin-100 rounded w-28" />
    </div>
  )
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const { startTour, getChecklist } = useOnboarding()
  const [kpis, setKpis]         = useState(null)
  const [lowStock, setLowStock]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())
  const adminChecklist = getChecklist('admin').filter(item => {
    if (item.id === 'reports') return ['supervisor', 'admin'].includes(user?.role)
    if (item.id === 'settings') return user?.role === 'admin'
    return user?.role !== 'superadmin'
  })
  const showAdminChecklist = adminChecklist.length > 0 && adminChecklist.some(item => !item.done)

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [kpiRes, stockRes] = await Promise.all([
        adminReportService.getKPIs(),
        adminStockService.getLowStock()
      ])
      setKpis(kpiRes.data.data)
      setLowStock(stockRes.data.data?.slice(0, 8) || [])
      setLastRefreshed(new Date())
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(true), 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-6" data-tour="admin-dashboard-header">
        <div>
          <h1 className="text-2xl font-admin font-bold text-admin-900">Dashboard</h1>
          <p className="text-admin-400 text-xs font-admin mt-0.5">
            Updated {timeAgo(lastRefreshed)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => startTour('admin', { force: true })}
            className="flex items-center gap-2 px-3 py-2 bg-brand-500/10 border border-brand-500/20 rounded-lg
              text-sm font-admin font-semibold text-brand-700 hover:bg-brand-500/15 transition-colors shadow-admin"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">Tour</span>
          </button>
          <button onClick={() => fetchData(true)} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-admin-200 rounded-lg
              text-sm font-admin text-admin-600 hover:bg-admin-50 transition-colors shadow-admin">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {showAdminChecklist && (
        <div className="mb-6">
          <OnboardingChecklistCard
            eyebrow="Operational Readiness"
            title="Bring new staff up to speed fast"
            description="This admin checklist keeps the first session focused on the pages that matter most, while still fitting the premium feel of your workspace."
            items={adminChecklist}
            actionLabel="Replay Tour"
            onAction={() => startTour('admin', { force: true })}
            theme="admin"
          />
        </div>
      )}

      {/* ── KPI Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6" data-tour="admin-kpis">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <KpiCard icon={ShoppingCart} label="Orders Today"    color="blue"
              value={kpis?.ordersToday ?? 0}
              link="/admin/orders" />
            <KpiCard icon={Clock}        label="Pending"         color="amber"
              value={kpis?.pendingOrders ?? 0}
              badge={kpis?.pendingOrders}
              link="/admin/orders?status=pending" />
            <KpiCard icon={DollarSign}   label="Revenue Today"   color="green"
              value={formatKES(kpis?.revenueToday ?? 0)} />
            <KpiCard icon={TrendingUp}   label="This Month"      color="brand"
              value={formatKES(kpis?.revenueThisMonth ?? 0)} />
            <KpiCard icon={AlertTriangle} label="Low Stock Items" color="red"
              value={kpis?.lowStockCount ?? 0}
              badge={kpis?.lowStockCount}
              link="/admin/stock" />
          </>
        )}
      </div>

      {/* ── Bottom panels ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden" data-tour="admin-recent-orders">
          <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100">
            <div>
              <h2 className="font-admin font-bold text-admin-900">Recent Orders</h2>
              <p className="text-admin-400 text-xs font-admin mt-0.5">Last 10 orders placed</p>
            </div>
            <Link to="/admin/orders"
              className="flex items-center gap-1 text-brand-600 hover:text-brand-700
                text-xs font-admin font-semibold transition-colors">
              View all <ArrowUpRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-admin-50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <div className="h-4 bg-admin-100 rounded w-28" />
                      <div className="h-5 bg-admin-100 rounded-full w-20" />
                    </div>
                    <div className="h-3 bg-admin-100 rounded w-40" />
                  </div>
                  <div className="h-4 bg-admin-100 rounded w-20" />
                </div>
              ))}
            </div>
          ) : !kpis?.recentOrders?.length ? (
            <div className="p-12 text-center">
              <ShoppingCart size={28} className="text-admin-300 mx-auto mb-3" />
              <p className="text-admin-500 font-admin font-medium">No orders yet</p>
              <p className="text-admin-400 text-xs font-admin mt-1">Orders will appear here when customers place them</p>
            </div>
          ) : (
            <div className="divide-y divide-admin-50">
              {kpis.recentOrders.map(order => (
                <Link key={order._id} to={`/admin/orders/${order._id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-admin-50 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-admin font-bold text-admin-800 text-sm tracking-wide">
                        {order.orderRef}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-admin-400 text-xs font-admin">
                      {order.userId?.name || order.guestId?.name || 'Guest'}
                      {' · '}{timeAgo(order.createdAt)}
                    </p>
                  </div>
                  <span className="font-admin font-bold text-admin-800 text-sm flex-shrink-0">
                    {formatKES(order.total)}
                  </span>
                  <ChevronRight size={15}
                    className="text-admin-300 group-hover:text-admin-500 flex-shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          )}

          {/* Quick actions */}
          <div className="border-t border-admin-100 px-5 py-3 bg-admin-50/40 flex gap-3">
            <Link to="/admin/orders?status=pending"
              className="text-xs font-admin text-admin-600 hover:text-brand-600 transition-colors">
              View pending →
            </Link>
            <Link to="/admin/products/new"
              className="text-xs font-admin text-admin-600 hover:text-brand-600 transition-colors">
              Add product →
            </Link>
            <Link to="/admin/reports"
              className="text-xs font-admin text-admin-600 hover:text-brand-600 transition-colors">
              View reports →
            </Link>
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden" data-tour="admin-low-stock">
          <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100">
            <div>
              <h2 className="font-admin font-bold text-admin-900">Low Stock</h2>
              <p className="text-admin-400 text-xs font-admin mt-0.5">Below threshold</p>
            </div>
            <Link to="/admin/stock"
              className="flex items-center gap-1 text-brand-600 hover:text-brand-700
                text-xs font-admin font-semibold transition-colors">
              Manage <ArrowUpRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-admin-50">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-admin-100 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-admin-100 rounded w-24" />
                    <div className="h-2 bg-admin-100 rounded w-32" />
                  </div>
                  <div className="h-4 bg-admin-100 rounded w-12" />
                </div>
              ))}
            </div>
          ) : lowStock.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={22} className="text-green-500" />
              </div>
              <p className="text-admin-700 font-admin font-semibold text-sm">All stock healthy</p>
              <p className="text-admin-400 text-xs font-admin mt-1">No products below threshold</p>
            </div>
          ) : (
            <div className="divide-y divide-admin-50">
              {lowStock.map((item, i) => (
                <Link key={i} to="/admin/stock"
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-admin-50 transition-colors group">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.stock === 0 ? 'bg-red-500' : 'bg-amber-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-admin-800 text-xs font-admin font-semibold truncate">
                      {item.productName}
                    </p>
                    <p className="text-admin-400 text-xs font-admin">
                      {item.varietyName} · {item.packagingSize}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-admin font-bold ${
                      item.stock === 0 ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {item.stock === 0 ? 'Out' : `${item.stock} left`}
                    </p>
                    <p className="text-admin-300 text-xs font-admin">
                      of {item.lowStockThreshold}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!loading && lowStock.length > 0 && (
            <div className="border-t border-admin-100 px-4 py-3 bg-admin-50/40">
              <Link to="/admin/stock"
                className="text-xs font-admin text-brand-600 hover:text-brand-700 font-semibold transition-colors">
                Update stock levels →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
