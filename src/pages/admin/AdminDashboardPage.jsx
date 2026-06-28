import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart, TrendingUp, DollarSign, Package, AlertTriangle,
  Clock, ChevronRight, RefreshCw, CheckCircle, ArrowUpRight,
  Banknote, Hourglass
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { useAuth } from '../../context/AuthContext'
import SuperAdminDashboardPage from './SuperAdminDashboardPage'
import { useOnboarding } from '../../context/OnboardingContext'
import { adminReportService } from '../../services/admin/report.service'
import { adminStockService } from '../../services/admin/stock.service'
import { OnboardingChecklistCard } from '../../components/onboarding/OnboardingEnhancements'
import { formatKES, timeAgo, getStatusLabel } from '../../utils/helpers'
import { ORDER_STATUS_CONFIG as STATUS_CONFIG } from '../../utils/constants'
import Spinner from '../../components/ui/Spinner'

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
    blue:  { icon: 'bg-blue-50 text-blue-600',     bar: 'border-l-blue-500'    },
    amber: { icon: 'bg-amber-50 text-amber-600',   bar: 'border-l-amber-500'   },
    green: { icon: 'bg-emerald-50 text-emerald-600', bar: 'border-l-emerald-500' },
    brand: { icon: 'bg-brand-50 text-brand-600',   bar: 'border-l-brand-500'   },
    red:   { icon: 'bg-red-50 text-red-600',       bar: 'border-l-red-500'     },
  }[color] || { icon: 'bg-admin-100 text-admin-600', bar: 'border-l-admin-300' }

  const inner = (
    <div className={`bg-white rounded-xl border border-admin-100 border-l-4 ${colorMap.bar}
      shadow-admin p-5 hover:shadow-admin-lg transition-all
      ${link ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap.icon}`}>
          <Icon size={17} />
        </div>
        {badge > 0 && (
          <span className={`text-xs font-admin font-bold px-2 py-0.5 rounded-full ${
            color === 'red' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {badge}
          </span>
        )}
      </div>
      <p className="font-admin font-bold text-admin-900 text-2xl leading-tight tracking-tight">{value}</p>
      <p className="text-admin-500 text-xs font-admin mt-1.5 font-medium">{label}</p>
      {sub && <p className="text-admin-400 text-xs font-admin mt-0.5">{sub}</p>}
    </div>
  )

  return link ? <Link to={link}>{inner}</Link> : inner
}

// ── SKELETON ──────────────────────────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-admin-100 border-l-4 border-l-admin-200 shadow-admin p-5 animate-pulse">
      <div className="w-9 h-9 bg-admin-100 rounded-lg mb-4" />
      <div className="h-7 bg-admin-100 rounded w-24 mb-2" />
      <div className="h-3 bg-admin-100 rounded w-28" />
    </div>
  )
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  if (user?.role === 'superadmin') return <SuperAdminDashboardPage />
  const { getChecklist } = useOnboarding()
  const [kpis, setKpis]             = useState(null)
  const [lowStock, setLowStock]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())
  const [revenueData, setRevenueData]     = useState([])
  const [revPeriod, setRevPeriod]         = useState('month')
  const [revLoading, setRevLoading]       = useState(true)
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
      setError('')
      const [kpiRes, stockRes] = await Promise.all([
        adminReportService.getKPIs(),
        adminStockService.getLowStock()
      ])
      setKpis(kpiRes.data.data)
      setLowStock(stockRes.data.data?.slice(0, 8) || [])
      setLastRefreshed(new Date())
    } catch {
      setError('Could not load dashboard metrics right now. Try refreshing.')
    }
    finally { setLoading(false); setRefreshing(false) }
  }

  const fetchRevenue = async (period) => {
    setRevLoading(true)
    try {
      const res = await adminReportService.getSales({ period })
      const raw = res.data?.data?.byDay || []
      setRevenueData(raw.map(d => ({
        date:    new Date(d.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
        revenue: Math.round(d.revenue),
        orders:  d.orders,
      })))
    } catch { setRevenueData([]) }
    finally { setRevLoading(false) }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(true), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => { fetchRevenue(revPeriod) }, [revPeriod])

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-6" data-tour="admin-dashboard-header">
        <div>
          <h1 className="text-2xl font-admin font-bold text-admin-900">Dashboard</h1>
          <p className="text-admin-400 text-xs font-admin mt-0.5">
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            <span className="mx-1.5 text-admin-300">·</span>
            Updated {timeAgo(lastRefreshed)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchData(true)} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-admin-200 rounded-lg
              text-sm font-admin text-admin-600 hover:bg-admin-50 transition-colors shadow-admin">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-admin text-red-700">
          {error}
        </div>
      )}

      {showAdminChecklist && (
        <div className="mb-6">
          <OnboardingChecklistCard
            eyebrow="Operational Readiness"
            title="Bring new staff up to speed fast"
            description="This admin checklist keeps the first session focused on the pages that matter most."
            items={adminChecklist}
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

      {/* ── Cash Flow Row ──────────────────────────────────────────────────── */}
      {(loading || kpis?.cashFlow) && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard icon={Banknote}  label="Paid This Month"   color="green"
                value={formatKES(kpis.cashFlow?.paidRevenue ?? 0)}
                sub={`${kpis.cashFlow?.paidOrders ?? 0} order${kpis.cashFlow?.paidOrders !== 1 ? 's' : ''} confirmed`} />
              <KpiCard icon={Hourglass} label="Awaiting Payment"  color="amber"
                value={formatKES(kpis.cashFlow?.unpaidRevenue ?? 0)}
                sub={`${kpis.cashFlow?.unpaidOrders ?? 0} order${kpis.cashFlow?.unpaidOrders !== 1 ? 's' : ''} outstanding`} />
            </>
          )}
        </div>
      )}

      {/* ── Revenue Trend Chart ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-admin-100 shadow-admin p-5 mb-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-admin font-bold text-admin-900 text-sm">Revenue Trend</h2>
            <p className="text-admin-400 text-xs font-admin mt-0.5">Approved + completed orders</p>
          </div>
          <div className="flex items-center gap-1 bg-admin-50 rounded-lg p-0.5 border border-admin-100">
            {[['week', '7D'], ['month', '30D']].map(([val, label]) => (
              <button key={val}
                onClick={() => setRevPeriod(val)}
                className={`px-3 py-1.5 rounded-md text-xs font-admin font-semibold transition-all ${
                  revPeriod === val
                    ? 'bg-white text-admin-900 shadow-sm'
                    : 'text-admin-500 hover:text-admin-700'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {revLoading ? (
          <div className="h-[180px] flex flex-col justify-end gap-1 pb-2 animate-pulse">
            {[60, 85, 45, 70, 90, 55, 75, 40, 65, 80, 50, 95].map((h, i) => (
              <div key={i} className="flex-1" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <div className="w-full rounded-sm bg-admin-100" style={{ height: `${h}%` }} />
              </div>
            ))}
          </div>
        ) : revenueData.length === 0 ? (
          <div className="h-[180px] flex flex-col items-center justify-center gap-2">
            <TrendingUp size={28} className="text-admin-200" />
            <p className="text-admin-400 text-xs font-admin">No approved orders in the past 30 days</p>
            <Link to="/admin/reports" className="text-xs font-admin font-semibold text-brand-600 hover:underline">
              View full reports →
            </Link>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dashRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#C8912A" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#C8912A" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1EDE6" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9E8E7A', fontFamily: 'Outfit' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9E8E7A', fontFamily: 'Outfit' }}
                tickFormatter={v => `${(v / 1000).toFixed(0)}K`}
                axisLine={false} tickLine={false} width={36}
              />
              <Tooltip
                formatter={(v, name) => [
                  name === 'revenue' ? formatKES(v) : v,
                  name === 'revenue' ? 'Revenue' : 'Orders',
                ]}
                contentStyle={{
                  fontFamily: 'Outfit', fontSize: 12,
                  borderRadius: 10, border: '1px solid #E8DDD0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#C8912A"
                strokeWidth={2}
                dot={{ r: 3, fill: '#C8912A', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#C8912A', stroke: '#fff', strokeWidth: 2 }}
                fill="url(#dashRevGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Bottom panels ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-admin-100 shadow-admin overflow-hidden" data-tour="admin-recent-orders">
          <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100 bg-admin-50/40">
            <div>
              <h2 className="font-admin font-bold text-admin-900 text-sm">Recent Orders</h2>
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
        <div className="bg-white rounded-xl border border-admin-100 shadow-admin overflow-hidden" data-tour="admin-low-stock">
          <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100 bg-admin-50/40">
            <div>
              <h2 className="font-admin font-bold text-admin-900 text-sm">Low Stock</h2>
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
