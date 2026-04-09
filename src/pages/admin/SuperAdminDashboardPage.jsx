import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  GitBranch, Users, ShoppingCart, Package, TrendingUp, Shield,
  Settings2, Activity, RefreshCw, ArrowUpRight, CheckCircle,
  AlertCircle, Clock, DollarSign, Eye, Layers, UserCog, Archive, Sparkles,
} from 'lucide-react'
import { adminBranchService } from '../../services/admin/branch.service'
import { adminUserService } from '../../services/admin/user.service'
import { adminReportService } from '../../services/admin/report.service'
import { adminLogService } from '../../services/admin/log.service'
import { formatKES, timeAgo } from '../../utils/helpers'
import { useOnboarding } from '../../context/OnboardingContext'
import { OnboardingChecklistCard } from '../../components/onboarding/OnboardingEnhancements'

// ── STAT CARD ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'brand', link }) {
  const colors = {
    brand:  { ring: 'border-brand-100',  icon: 'bg-brand-50 text-brand-600'  },
    green:  { ring: 'border-green-100',  icon: 'bg-green-50 text-green-600'  },
    blue:   { ring: 'border-blue-100',   icon: 'bg-blue-50 text-blue-600'    },
    purple: { ring: 'border-purple-100', icon: 'bg-purple-50 text-purple-600'},
    amber:  { ring: 'border-amber-100',  icon: 'bg-amber-50 text-amber-600'  },
    red:    { ring: 'border-red-100',    icon: 'bg-red-50 text-red-600'      },
  }[color]

  const inner = (
    <div className={`bg-white rounded-xl border shadow-admin p-4 transition-all
      ${colors.ring} ${link ? 'hover:shadow-admin-lg hover:-translate-y-0.5 cursor-pointer' : ''}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colors.icon}`}>
        <Icon size={18} />
      </div>
      <p className="font-admin font-bold text-admin-900 text-xl leading-tight">{value}</p>
      <p className="text-admin-400 text-xs font-admin mt-1">{label}</p>
      {sub && <p className="text-admin-300 text-xs font-admin mt-0.5">{sub}</p>}
    </div>
  )
  return link ? <Link to={link}>{inner}</Link> : inner
}

// ── QUICK ACTION CARD ─────────────────────────────────────────────────────────
function ActionCard({ icon: Icon, label, desc, to, color = 'brand' }) {
  const colors = {
    brand:  'bg-brand-500 hover:bg-brand-600',
    red:    'bg-red-600 hover:bg-red-700',
    blue:   'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    green:  'bg-green-600 hover:bg-green-700',
    amber:  'bg-amber-500 hover:bg-amber-600',
  }[color]

  return (
    <Link to={to}
      className={`flex items-start gap-3 p-4 rounded-xl text-white transition-all
        active:scale-[0.98] ${colors}`}>
      <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="font-admin font-bold text-sm leading-tight">{label}</p>
        <p className="text-white/70 text-xs font-admin mt-0.5 leading-snug">{desc}</p>
      </div>
    </Link>
  )
}

// ── BRANCH STATUS BADGE ───────────────────────────────────────────────────────
function BranchBadge({ isActive, isDefault }) {
  if (isDefault) return (
    <span className="inline-flex items-center gap-1 text-xs font-admin font-semibold
      px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
      <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
      Default
    </span>
  )
  if (isActive) return (
    <span className="inline-flex items-center gap-1 text-xs font-admin font-semibold
      px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      Active
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-admin font-semibold
      px-2 py-0.5 rounded-full bg-admin-100 text-admin-500 border border-admin-200">
      <span className="w-1.5 h-1.5 rounded-full bg-admin-400" />
      Inactive
    </span>
  )
}

// ── LOG ICON ─────────────────────────────────────────────────────────────────
const LOG_COLORS = {
  auth: 'bg-blue-100 text-blue-600', order: 'bg-amber-100 text-amber-600',
  product: 'bg-brand-100 text-brand-600', stock: 'bg-green-100 text-green-600',
  payment: 'bg-purple-100 text-purple-600', account: 'bg-red-100 text-red-600',
}
const getLogColor = (action = '') => {
  if (action.includes('LOGIN') || action.includes('LOGOUT') || action.includes('AUTH')) return LOG_COLORS.auth
  if (action.includes('ORDER')) return LOG_COLORS.order
  if (action.includes('PRODUCT') || action.includes('BRANCH')) return LOG_COLORS.product
  if (action.includes('STOCK')) return LOG_COLORS.stock
  if (action.includes('PAYMENT')) return LOG_COLORS.payment
  return LOG_COLORS.account
}

// ── SKELETON ──────────────────────────────────────────────────────────────────
function Skel({ w = 'w-20', h = 'h-4' }) {
  return <div className={`${h} ${w} bg-admin-100 rounded animate-pulse`} />
}

export default function SuperAdminDashboardPage() {
  const { startTour, getChecklist } = useOnboarding()
  const [branches, setBranches]   = useState([])
  const [users, setUsers]         = useState([])
  const [kpis, setKpis]           = useState(null)
  const [logs, setLogs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())

  const fetchAll = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const [branchRes, userRes, kpiRes, logRes] = await Promise.allSettled([
        adminBranchService.getAll(true),
        adminUserService.getAll(),
        adminReportService.getKPIs(),
        adminLogService.getLogs({ page: 1, limit: 6 }),
      ])
      if (branchRes.status === 'fulfilled') setBranches(branchRes.value.data?.data || [])
      if (userRes.status === 'fulfilled')   setUsers(userRes.value.data?.data || [])
      if (kpiRes.status === 'fulfilled')    setKpis(kpiRes.value.data?.data)
      if (logRes.status === 'fulfilled')    setLogs(logRes.value.data?.data?.logs || logRes.value.data?.data || [])
      setLastRefreshed(new Date())
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(() => fetchAll(true), 60000)
    return () => clearInterval(interval)
  }, [])

  const activeBranches  = branches.filter(b => b.isActive).length
  const totalUsers      = users.length
  const nonSuperAdmins  = users.filter(u => u.role !== 'superadmin').length

  const superadminChecklist = getChecklist('superadmin')
  const showChecklist = superadminChecklist.length > 0 && superadminChecklist.some(item => !item.done)

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6" data-tour="superadmin-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-admin font-bold text-red-600 uppercase tracking-widest">
              Superadmin
            </span>
          </div>
          <h1 className="text-2xl font-admin font-bold text-admin-900">Platform Control</h1>
          <p className="text-admin-400 text-xs font-admin mt-0.5">
            System-wide view — updated {timeAgo(lastRefreshed)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => startTour('superadmin', { force: true })}
            className="flex items-center gap-2 px-3 py-2 bg-brand-500/10 border border-brand-500/20 rounded-lg
              text-sm font-admin font-semibold text-brand-700 hover:bg-brand-500/15 transition-colors shadow-admin"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">Tour</span>
          </button>
          <button onClick={() => fetchAll(true)} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-admin-200 rounded-lg
              text-sm font-admin text-admin-600 hover:bg-admin-50 transition-colors shadow-admin">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {showChecklist && (
        <div className="mb-6">
          <OnboardingChecklistCard
            eyebrow="Platform Setup"
            title="Get familiar with the control center"
            description="These steps cover the key areas of the superadmin workspace so you can manage the platform with confidence."
            items={superadminChecklist}
            actionLabel="Replay Tour"
            onAction={() => startTour('superadmin', { force: true })}
            theme="admin"
          />
        </div>
      )}

      {/* ── Platform Stats ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6" data-tour="superadmin-platform-stats">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-admin-100 p-4 animate-pulse">
              <div className="w-9 h-9 bg-admin-100 rounded-xl mb-3" />
              <div className="h-6 bg-admin-100 rounded w-16 mb-1" />
              <div className="h-3 bg-admin-100 rounded w-24" />
            </div>
          ))
        ) : (
          <>
            <StatCard icon={GitBranch}   label="Active Branches"    value={activeBranches}   color="brand"  link="/admin/branches" sub={`${branches.length} total`} />
            <StatCard icon={Users}       label="Staff Accounts"     value={nonSuperAdmins}   color="blue"   link="/admin/users"    sub={`${totalUsers} total incl. SA`} />
            <StatCard icon={ShoppingCart} label="All-time Orders"   value={kpis?.ordersToday !== undefined ? (kpis.totalOrders ?? '—') : '—'} color="amber" />
            <StatCard icon={DollarSign}  label="System Revenue"     value={kpis?.revenueThisMonth !== undefined ? formatKES(kpis.revenueThisMonth) : '—'} color="green" sub="This month (all branches)" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">

        {/* ── Branches Overview ───────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden" data-tour="superadmin-branches">
          <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100">
            <div>
              <h2 className="font-admin font-bold text-admin-900">Branches</h2>
              <p className="text-admin-400 text-xs font-admin mt-0.5">
                {activeBranches} active of {branches.length} total
              </p>
            </div>
            <Link to="/admin/branches"
              className="flex items-center gap-1 text-brand-600 hover:text-brand-700
                text-xs font-admin font-semibold transition-colors">
              Manage <ArrowUpRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-admin-50">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                  <div className="w-9 h-9 bg-admin-100 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skel w="w-32" />
                    <Skel w="w-48" h="h-3" />
                  </div>
                  <Skel w="w-16" />
                </div>
              ))}
            </div>
          ) : branches.length === 0 ? (
            <div className="py-12 text-center">
              <GitBranch size={28} className="text-admin-300 mx-auto mb-3" />
              <p className="text-admin-500 font-admin font-medium mb-1">No branches yet</p>
              <Link to="/admin/branches"
                className="text-sm font-admin font-semibold text-brand-600 hover:text-brand-700">
                Create your first branch →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-admin-50">
              {branches.map(b => (
                <div key={b._id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-brand-100">
                    <GitBranch size={16} className="text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-admin font-semibold text-admin-800 text-sm leading-tight">{b.name}</p>
                    <p className="text-admin-400 text-xs font-admin mt-0.5 truncate">
                      {b.location || 'No location set'}{b.slug ? ` · /${b.slug}` : ''}
                    </p>
                  </div>
                  <BranchBadge isActive={b.isActive} isDefault={b.isDefault} />
                  <Link to="/admin/branches"
                    className="text-admin-300 hover:text-admin-600 transition-colors flex-shrink-0">
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          )}

          <div className="px-5 py-3 border-t border-admin-100 bg-admin-50/40">
            <Link to="/admin/branches"
              className="text-xs font-admin text-brand-600 hover:text-brand-700 font-semibold transition-colors">
              + Create new branch
            </Link>
          </div>
        </div>

        {/* ── Quick Actions ────────────────────────────────────────────── */}
        <div className="space-y-2.5" data-tour="superadmin-system-controls">
          <h2 className="font-admin font-bold text-admin-900 text-sm px-1 mb-3">System Controls</h2>
          <ActionCard icon={GitBranch} label="Branch Management" desc="Create, edit, assign staff" to="/admin/branches" color="brand" />
          <ActionCard icon={UserCog}   label="User Management"   desc="Accounts, roles, passwords" to="/admin/users"    color="blue" />
          <ActionCard icon={Shield}    label="Activity Log"       desc="Full audit trail"           to="/admin/logs"     color="purple" />
          <ActionCard icon={Archive}   label="System Backups"     desc="Create, download, restore"  to="/admin/backups"  color="amber" />
          <ActionCard icon={Settings2} label="System Settings"    desc="Shop info, payments, maintenance" to="/admin/settings" color="green" />

          {/* Observe section */}
          <div className="pt-2 border-t border-admin-100">
            <p className="text-[10px] font-admin font-bold text-admin-400 uppercase tracking-widest px-1 mb-2">
              Observe (View Only)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: ShoppingCart, label: 'Orders',   to: '/admin/orders'    },
                { icon: Package,      label: 'Products', to: '/admin/products'  },
                { icon: Layers,       label: 'Stock',    to: '/admin/stock'     },
                { icon: TrendingUp,   label: 'Reports',  to: '/admin/reports'   },
              ].map(({ icon: Icon, label, to }) => (
                <Link key={to} to={to}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border
                    border-admin-200 text-admin-600 hover:border-admin-300 hover:text-admin-800
                    text-xs font-admin font-medium transition-all shadow-admin">
                  <Icon size={13} className="text-admin-400 flex-shrink-0" />
                  {label}
                  <Eye size={11} className="text-admin-300 ml-auto flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Activity ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden" data-tour="superadmin-activity">
        <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100">
          <div>
            <h2 className="font-admin font-bold text-admin-900">Recent Activity</h2>
            <p className="text-admin-400 text-xs font-admin mt-0.5">System-wide audit trail</p>
          </div>
          <Link to="/admin/logs"
            className="flex items-center gap-1 text-brand-600 hover:text-brand-700
              text-xs font-admin font-semibold transition-colors">
            Full log <ArrowUpRight size={13} />
          </Link>
        </div>

        {loading ? (
          <div className="divide-y divide-admin-50">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <div className="w-8 h-8 bg-admin-100 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skel w="w-40" />
                  <Skel w="w-24" h="h-3" />
                </div>
                <Skel w="w-16" h="h-3" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center">
            <Activity size={24} className="text-admin-300 mx-auto mb-2" />
            <p className="text-admin-400 text-sm font-admin">No activity yet</p>
          </div>
        ) : (
          <div className="divide-y divide-admin-50">
            {logs.map((log, i) => (
              <div key={log._id || i} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                  text-xs font-admin font-bold ${getLogColor(log.action)}`}>
                  {(log.actorName || log.actor || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-admin-800 text-xs font-admin font-semibold leading-tight">
                    {log.actorName || log.actor || 'System'}
                    <span className="text-admin-400 font-normal ml-1.5">
                      {(log.action || '').toLowerCase().replace(/_/g, ' ')}
                    </span>
                  </p>
                  {log.detail && (
                    <p className="text-admin-400 text-xs font-admin mt-0.5 truncate">
                      {typeof log.detail === 'string' ? log.detail
                        : log.detail.name || log.detail.productName || log.detail.orderRef || ''}
                    </p>
                  )}
                </div>
                <p className="text-admin-300 text-xs font-admin flex-shrink-0">
                  {timeAgo(log.createdAt || log.timestamp)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
