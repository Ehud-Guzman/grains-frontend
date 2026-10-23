import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart, TrendingUp, AlertTriangle, Clock, ChevronRight, RefreshCw, CheckCircle,
  ArrowUpRight, Banknote, Hourglass, Plus, PackageSearch,
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
import { adminOrderService } from '../../services/admin/order.service'
import { SEES_KPIS, getGreeting } from '../../components/admin/adminNav'
import { OnboardingChecklistCard } from '../../components/onboarding/OnboardingEnhancements'
import { formatKES, timeAgo, getStatusLabel } from '../../utils/helpers'
import { ORDER_STATUS_CONFIG as STATUS_CONFIG } from '../../utils/constants'
import { startVisiblePolling } from '../../utils/visiblePolling'

// Chart ink = tailwind `shell-600`; recharts wants literals.
const CHART_INK = '#2E6649'
const CHART_TICK = { fontSize: 11, fill: '#6B7280', fontFamily: 'Outfit' }

function StatusBadge({ status, deliveryMethod }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-admin font-semibold
      px-2.5 py-1 rounded-full border ${cfg.badge} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {getStatusLabel(status, deliveryMethod)}
    </span>
  )
}

// A card with a titled header row. Every panel below uses it so they line up.
function Panel({ title, subtitle, action, children, className = '', ...rest }) {
  return (
    <section className={`bg-white rounded-2xl border border-admin-200/70 shadow-admin overflow-hidden ${className}`} {...rest}>
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-admin-100">
        <div className="min-w-0">
          <h2 className="font-admin font-semibold text-admin-900 text-[15px] leading-tight">{title}</h2>
          {subtitle && <p className="text-admin-500 text-xs font-admin mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

function PanelLink({ to, children }) {
  return (
    <Link to={to} className="flex items-center gap-1 text-brand-700 hover:text-brand-800 text-xs font-admin font-semibold transition-colors flex-shrink-0">
      {children} <ArrowUpRight size={13} aria-hidden="true" />
    </Link>
  )
}

// ── STAT TILE ─────────────────────────────────────────────────────────────────
// One tone for "all quiet", a warning tone only when the number is something to act on —
// so colour on this row means "look here" rather than decoration.
const TILE_TONES = {
  calm:  'bg-shell-50 text-shell-600',
  amber: 'bg-amber-50 text-amber-600',
  red:   'bg-red-50 text-red-600',
}

function StatTile({ icon: Icon, label, value, sub, tone = 'calm', link }) {
  const inner = (
    <div className={`h-full p-5 bg-white transition-colors ${link ? 'hover:bg-admin-50' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${TILE_TONES[tone]}`}>
          <Icon size={17} aria-hidden="true" />
        </div>
        {link && <ChevronRight size={15} className="text-admin-300" aria-hidden="true" />}
      </div>
      <p className="font-admin font-bold text-admin-900 text-2xl leading-tight tracking-tight break-words">{value}</p>
      <p className="text-admin-600 text-[13px] font-admin font-medium mt-1">{label}</p>
      {sub && <p className="text-admin-500 text-xs font-admin mt-0.5">{sub}</p>}
    </div>
  )
  return link ? <Link to={link} className="block">{inner}</Link> : inner
}

function TileSkeleton() {
  return (
    <div className="p-5 bg-white animate-pulse">
      <div className="w-9 h-9 bg-admin-100 rounded-xl mb-3" />
      <div className="h-7 bg-admin-100 rounded w-24 mb-2" />
      <div className="h-3 bg-admin-100 rounded w-28" />
    </div>
  )
}

// What needs doing right now, as tappable chips. Silent when there is nothing: a dashboard
// that always shouts stops being read.
function AttentionStrip({ pending, lowStock, unpaid }) {
  const items = [
    pending > 0 && { to: '/admin/orders?status=pending', icon: Clock, tone: 'amber',
      text: `${pending} order${pending === 1 ? '' : 's'} waiting for approval` },
    lowStock > 0 && { to: '/admin/stock', icon: PackageSearch, tone: 'red',
      text: `${lowStock} item${lowStock === 1 ? '' : 's'} low or out of stock` },
    unpaid > 0 && { to: '/admin/orders', icon: Hourglass, tone: 'blue',
      text: `${unpaid} order${unpaid === 1 ? '' : 's'} awaiting payment this month` },
  ].filter(Boolean)
  if (items.length === 0) return null

  const tones = {
    amber: 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100',
    red:   'bg-red-50 border-red-200 text-red-800 hover:bg-red-100',
    blue:  'bg-sky-50 border-sky-200 text-sky-900 hover:bg-sky-100',
  }
  return (
    <ul aria-label="Needs attention" className="flex flex-wrap gap-2 mb-5">
      {items.map(({ to, icon: Icon, tone, text }) => (
        <li key={to + text}>
          <Link to={to} className={`flex items-center gap-2 px-3 py-2 rounded-full border text-[13px] font-admin font-semibold transition-colors ${tones[tone]}`}>
            <Icon size={14} aria-hidden="true" /> {text} <ArrowUpRight size={13} aria-hidden="true" className="opacity-60" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

// This month at a glance: the gross figure, and how much of it has actually been paid.
function MonthCard({ loading, kpis }) {
  const cf = kpis?.cashFlow
  const paid = cf?.paidRevenue ?? 0
  const unpaid = cf?.unpaidRevenue ?? 0
  const placed = paid + unpaid
  const paidPct = placed > 0 ? Math.round((paid / placed) * 100) : 0
  const plural = (n) => `${n} order${n === 1 ? '' : 's'}`

  return (
    <Panel title="This Month (gross)" subtitle="Orders placed since the 1st" className="flex flex-col">
      {loading ? (
        <div className="p-5 space-y-4 animate-pulse">
          <div className="h-8 bg-admin-100 rounded w-40" />
          <div className="h-2.5 bg-admin-100 rounded-full" />
          <div className="h-4 bg-admin-100 rounded w-full" />
          <div className="h-4 bg-admin-100 rounded w-full" />
        </div>
      ) : (
        <div className="p-5 flex-1 flex flex-col">
          <p className="font-admin font-bold text-admin-900 text-3xl tracking-tight">{formatKES(kpis?.revenueThisMonth ?? 0)}</p>
          {cf ? (
            <>
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-admin text-admin-600 mb-1.5">
                  <span>Paid</span>
                  <span className="font-semibold text-admin-800">{paidPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-amber-100 overflow-hidden"
                  role="img" aria-label={`${paidPct}% of this month's orders are paid`}>
                  <div className="h-full rounded-full bg-shell-500 transition-[width] duration-500" style={{ width: `${paidPct}%` }} />
                </div>
              </div>
              <dl className="mt-5 space-y-3 text-sm font-admin">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-admin-600">Placed</dt>
                  <dd className="text-right">
                    <span className="font-semibold text-admin-900">{formatKES(placed)}</span>
                    <span className="block text-xs text-admin-500">{plural((cf.paidOrders ?? 0) + (cf.unpaidOrders ?? 0))} total</span>
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="flex items-center gap-2 text-admin-600">
                    <span aria-hidden="true" className="w-2 h-2 rounded-full bg-shell-500" /> Paid
                  </dt>
                  <dd className="text-right">
                    <span className="font-semibold text-admin-900">{formatKES(paid)}</span>
                    <span className="block text-xs text-admin-500">{plural(cf.paidOrders ?? 0)} confirmed</span>
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="flex items-center gap-2 text-admin-600">
                    <span aria-hidden="true" className="w-2 h-2 rounded-full bg-amber-400" /> Awaiting payment
                  </dt>
                  <dd className="text-right">
                    <span className="font-semibold text-admin-900">{formatKES(unpaid)}</span>
                    <span className="block text-xs text-admin-500">{plural(cf.unpaidOrders ?? 0)} outstanding</span>
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-admin-500 text-xs font-admin mt-3">Payment breakdown is not available right now.</p>
          )}
        </div>
      )}
    </Panel>
  )
}

// Thin role switch: superadmin gets its own dashboard component. Kept as a
// wrapper so each variant has a stable hook order — an early return above
// other hook calls violates the Rules of Hooks.
export default function AdminDashboardPage() {
  const { user } = useAuth()
  if (user?.role === 'superadmin') return <SuperAdminDashboardPage />
  return <BusinessDashboardPage />
}

function BusinessDashboardPage() {
  const { user } = useAuth()
  // Reports and stock levels are supervisor+ on the API. Staff used to get the same page
  // and therefore only ever saw an error; they now get an orders-based view instead.
  const canSeeKpis = SEES_KPIS.includes(user?.role)
  const isAdmin = user?.role === 'admin'
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
  const [trending, setTrending]           = useState([])
  const [trendingLoading, setTrendingLoading] = useState(true)
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
      if (canSeeKpis) {
        const [kpiRes, stockRes] = await Promise.all([
          adminReportService.getKPIs(),
          adminStockService.getLowStock()
        ])
        setKpis(kpiRes.data.data)
        setLowStock(stockRes.data.data?.slice(0, 8) || [])
      } else {
        // Staff: the order queue only.
        const [recentRes, pendingRes] = await Promise.all([
          adminOrderService.getAll({ limit: 10 }),
          adminOrderService.getAll({ status: 'pending', limit: 1 }),
        ])
        setKpis({
          recentOrders: recentRes.data?.data || [],
          pendingOrders: pendingRes.data?.pagination?.total || 0,
        })
      }
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
    return startVisiblePolling(() => fetchData(true), 60000)
  }, [])

  useEffect(() => { if (canSeeKpis) fetchRevenue(revPeriod) }, [revPeriod, canSeeKpis])

  useEffect(() => {
    if (!canSeeKpis) { setTrendingLoading(false); return }
    setTrendingLoading(true)
    adminReportService.getBestSellers({ period: 'week', limit: 5 })
      .then(res => setTrending(res.data?.data?.products || []))
      .catch(() => setTrending([]))
      .finally(() => setTrendingLoading(false))
  }, [])

  const periodTotal = revenueData.reduce((n, d) => n + d.revenue, 0)
  const topSold = Math.max(1, ...trending.map(p => p.unitsSold || 0))

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5" data-tour="admin-dashboard-header">
        <div>
          <h1 className="text-2xl font-admin font-bold text-admin-900 tracking-tight">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-admin-500 text-[13px] font-admin mt-0.5">
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            <span className="mx-1.5 text-admin-300">·</span>
            Updated {timeAgo(lastRefreshed)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Only the shortcuts this role can actually open: a link to a page the role is
              bounced from is worse than no link. */}
          <Link to="/admin/orders?status=pending"
            className="flex items-center gap-2 px-3.5 py-2 min-h-[40px] bg-white border border-admin-200 rounded-xl
              text-sm font-admin font-semibold text-admin-700 hover:bg-admin-50 transition-colors shadow-admin">
            <Clock size={14} className="text-amber-600" aria-hidden="true" /> Pending orders
          </Link>
          {isAdmin && (
            <Link to="/admin/products/new"
              className="flex items-center gap-2 px-3.5 py-2 min-h-[40px] bg-brand-600 text-white rounded-xl
                text-sm font-admin font-semibold hover:bg-brand-700 transition-colors shadow-admin">
              <Plus size={14} aria-hidden="true" /> Add product
            </Link>
          )}
          <button type="button" onClick={() => fetchData(true)} disabled={refreshing} aria-label="Refresh dashboard"
            className="flex items-center gap-2 px-3.5 py-2 min-h-[40px] bg-white border border-admin-200 rounded-xl
              text-sm font-admin text-admin-600 hover:bg-admin-50 transition-colors shadow-admin">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-admin text-red-700">
          {error}
        </div>
      )}

      {!loading && (
        <AttentionStrip
          pending={kpis?.pendingOrders ?? 0}
          lowStock={canSeeKpis ? (kpis?.lowStockCount ?? 0) : 0}
          unpaid={canSeeKpis ? (kpis?.cashFlow?.unpaidOrders ?? 0) : 0}
        />
      )}

      {/* ── Today: one band, four numbers ───────────────────────────────── */}
      {/* gap-px over a tinted track draws the dividers, whatever the column count */}
      <div data-tour="admin-kpis"
        className={`grid gap-px bg-admin-200/70 rounded-2xl border border-admin-200/70 shadow-admin overflow-hidden mb-5
          grid-cols-2 ${canSeeKpis ? 'lg:grid-cols-4' : ''}`}>
        {loading ? (
          Array.from({ length: canSeeKpis ? 4 : 2 }).map((_, i) => <TileSkeleton key={i} />)
        ) : !canSeeKpis ? (
          <>
            <StatTile icon={Clock} label="Pending Orders" tone={kpis?.pendingOrders > 0 ? 'amber' : 'calm'}
              value={kpis?.pendingOrders ?? 0}
              sub="Waiting for approval" link="/admin/orders?status=pending" />
            <StatTile icon={ShoppingCart} label="All Orders"
              value="View" sub="Open the full order list" link="/admin/orders" />
          </>
        ) : (
          <>
            <StatTile icon={ShoppingCart} label="Orders Today"
              value={kpis?.ordersToday ?? 0} sub="Placed since midnight"
              link="/admin/orders" />
            <StatTile icon={Clock} label="Pending" tone={kpis?.pendingOrders > 0 ? 'amber' : 'calm'}
              value={kpis?.pendingOrders ?? 0} sub="Waiting for approval"
              link="/admin/orders?status=pending" />
            <StatTile icon={Banknote} label="Revenue Today (gross)"
              value={formatKES(kpis?.revenueToday ?? 0)} sub="Before payment confirmation" />
            <StatTile icon={AlertTriangle} label="Low Stock Items" tone={kpis?.lowStockCount > 0 ? 'red' : 'calm'}
              value={kpis?.lowStockCount ?? 0} sub={kpis?.lowStockCount > 0 ? 'Needs restocking' : 'All stocked'}
              link="/admin/stock" />
          </>
        )}
      </div>

      {/* ── Money: trend beside the month's cash position ───────────────── */}
      {canSeeKpis && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          <Panel className="lg:col-span-2"
            title="Revenue Trend"
            subtitle={revLoading || revenueData.length === 0
              ? 'Approved + completed orders'
              : `${formatKES(periodTotal)} · approved + completed orders`}
            action={
              <div className="flex items-center gap-0.5 bg-admin-100 rounded-lg p-0.5">
                {[['week', '7D'], ['month', '30D']].map(([val, label]) => (
                  <button key={val} type="button" aria-pressed={revPeriod === val}
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
            }>
            <div className="p-5">
              {revLoading ? (
                <div className="h-[220px] flex items-end gap-1.5 animate-pulse">
                  {[60, 85, 45, 70, 90, 55, 75, 40, 65, 80, 50, 95].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-admin-100" style={{ height: `${h}%` }} />
                  ))}
                </div>
              ) : revenueData.length === 0 ? (
                <div className="h-[220px] flex flex-col items-center justify-center gap-2">
                  <TrendingUp size={28} className="text-admin-300" aria-hidden="true" />
                  <p className="text-admin-500 text-xs font-admin">No approved orders in the past 30 days</p>
                  <Link to="/admin/reports" className="text-xs font-admin font-semibold text-brand-700 hover:underline">
                    View full reports →
                  </Link>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={CHART_INK} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={CHART_INK} stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="date" tick={CHART_TICK} axisLine={false} tickLine={false} minTickGap={28} />
                    <YAxis
                      tick={CHART_TICK}
                      tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`}
                      axisLine={false} tickLine={false} width={36}
                    />
                    <Tooltip
                      formatter={(v, name) => [
                        name === 'revenue' ? formatKES(v) : v,
                        name === 'revenue' ? 'Revenue' : 'Orders',
                      ]}
                      contentStyle={{
                        fontFamily: 'Outfit', fontSize: 12,
                        borderRadius: 10, border: '1px solid #E5E7EB',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={CHART_INK}
                      strokeWidth={2}
                      dot={revenueData.length > 14 ? false : { r: 3, fill: CHART_INK, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: CHART_INK, stroke: '#fff', strokeWidth: 2 }}
                      fill="url(#dashRevGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>

          <MonthCard loading={loading} kpis={kpis} />
        </div>
      )}

      {/* ── Work: the order queue beside stock and what is selling ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Orders */}
        <Panel className={canSeeKpis ? 'lg:col-span-2' : 'lg:col-span-3'}
          data-tour="admin-recent-orders"
          title="Recent Orders" subtitle="Last 10 orders placed"
          action={<PanelLink to="/admin/orders">View all</PanelLink>}>
          {loading ? (
            <div className="divide-y divide-admin-100">
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
              <ShoppingCart size={28} className="text-admin-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-admin-600 font-admin font-medium">No orders yet</p>
              <p className="text-admin-500 text-xs font-admin mt-1">Orders will appear here when customers place them</p>
            </div>
          ) : (
            <div className="divide-y divide-admin-100">
              {kpis.recentOrders.map(order => (
                <Link key={order._id} to={`/admin/orders/${order._id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-admin-50 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-0.5">
                      <span className="font-admin font-bold text-admin-800 text-sm tracking-wide whitespace-nowrap">
                        {order.orderRef}
                      </span>
                      <StatusBadge status={order.status} deliveryMethod={order.deliveryMethod} />
                    </div>
                    <p className="text-admin-500 text-xs font-admin">
                      {order.userId?.name || order.guestId?.name || 'Guest'}
                      {' · '}{timeAgo(order.createdAt)}
                    </p>
                  </div>
                  <span className="font-admin font-bold text-admin-800 text-sm flex-shrink-0">
                    {formatKES(order.total)}
                  </span>
                  <ChevronRight size={15} aria-hidden="true"
                    className="text-admin-300 group-hover:text-admin-500 flex-shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </Panel>

        {canSeeKpis && (
          <div className="space-y-5">
            {/* Low Stock */}
            <Panel data-tour="admin-low-stock"
              title="Low Stock" subtitle="Below threshold"
              action={<PanelLink to="/admin/stock">Manage</PanelLink>}>
              {loading ? (
                <div className="divide-y divide-admin-100">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
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
                <div className="p-8 text-center">
                  <div className="w-11 h-11 bg-shell-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={21} className="text-shell-600" aria-hidden="true" />
                  </div>
                  <p className="text-admin-800 font-admin font-semibold text-sm">All stock healthy</p>
                  <p className="text-admin-500 text-xs font-admin mt-1">No products below threshold</p>
                </div>
              ) : (
                <div className="divide-y divide-admin-100">
                  {lowStock.map((item, i) => (
                    <Link key={i} to="/admin/stock"
                      className="flex items-center gap-3 px-5 py-3 hover:bg-admin-50 transition-colors">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        item.stock === 0 ? 'bg-red-500' : 'bg-amber-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-admin-800 text-[13px] font-admin font-semibold truncate">
                          {item.productName}
                        </p>
                        <p className="text-admin-500 text-xs font-admin truncate">
                          {item.varietyName} · {item.packagingSize}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs font-admin font-bold ${
                          item.stock === 0 ? 'text-red-600' : 'text-amber-700'
                        }`}>
                          {item.stock === 0 ? 'Out' : `${item.stock} left`}
                        </p>
                        <p className="text-admin-500 text-xs font-admin">
                          of {item.lowStockThreshold}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>

            {/* Most moving products */}
            <Panel title="Most Moving Products" subtitle="By units sold, last 7 days"
              action={<PanelLink to="/admin/reports">Full report</PanelLink>}>
              {trendingLoading ? (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-9 bg-admin-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : trending.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-admin-600 font-admin font-medium text-sm">No sales in the last 7 days</p>
                </div>
              ) : (
                <ol className="p-5 space-y-3.5">
                  {trending.map((p, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-admin font-bold text-admin-400 tabular-nums">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-admin-800 text-[13px] font-admin font-semibold truncate">{p.productName}</p>
                          <p className="text-shell-700 text-xs font-admin font-bold flex-shrink-0">{p.unitsSold} sold</p>
                        </div>
                        <p className="text-admin-500 text-xs font-admin truncate">{p.variety} · {p.packaging}</p>
                        <div className="h-1.5 rounded-full bg-admin-100 mt-1.5 overflow-hidden" aria-hidden="true">
                          <div className="h-full rounded-full bg-shell-400" style={{ width: `${Math.max(6, ((p.unitsSold || 0) / topSold) * 100)}%` }} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>
        )}
      </div>

      {/* Onboarding sits last: new staff still find it, but it never pushes live numbers off-screen. */}
      {showAdminChecklist && (
        <div className="mt-5">
          <OnboardingChecklistCard
            eyebrow="Operational Readiness"
            title="Bring new staff up to speed fast"
            description="This admin checklist keeps the first session focused on the pages that matter most."
            items={adminChecklist}
            theme="admin"
          />
        </div>
      )}
    </div>
  )
}
