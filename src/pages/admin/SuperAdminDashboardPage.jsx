import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  GitBranch, ShoppingCart, Package, TrendingUp, Shield, Settings2, Activity, RefreshCw,
  ArrowUpRight, CheckCircle2, Clock, DollarSign, Eye, Layers, UserCog, Archive, Gauge,
  ShieldAlert, AlertTriangle, Database,
} from 'lucide-react'
import { adminControlCenterService } from '../../services/admin/controlCenter.service'
import { adminLogService } from '../../services/admin/log.service'
import { formatKES, timeAgo } from '../../utils/helpers'
import { useOnboarding } from '../../context/OnboardingContext'
import { OnboardingChecklistCard } from '../../components/onboarding/OnboardingEnhancements'

// The superadmin's landing page: a cross-branch glance. Everything numeric comes from the
// Control Center overview (the same data, computed once on the server), so this page and the
// Control Center can never disagree. The Control Center is where you act; this is where you
// look first.

const REFRESH_MS = 60 * 1000

// ── STAT CARD ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, tone = 'brand', link }) {
  const tones = {
    brand:  { ring: 'border-brand-100',  icon: 'bg-brand-50 text-brand-600' },
    green:  { ring: 'border-green-100',  icon: 'bg-green-50 text-green-600' },
    blue:   { ring: 'border-blue-100',   icon: 'bg-blue-50 text-blue-600' },
    amber:  { ring: 'border-amber-200',  icon: 'bg-amber-50 text-amber-600' },
    red:    { ring: 'border-red-200',    icon: 'bg-red-50 text-red-600' },
  }[tone]

  const inner = (
    <div className={`bg-white rounded-xl border shadow-admin p-4 h-full transition-all ${tones.ring}
      ${link ? 'hover:shadow-admin-lg hover:-translate-y-0.5' : ''}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${tones.icon}`}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <p className="font-admin font-bold text-admin-900 text-xl leading-tight truncate">{value}</p>
      <p className="text-admin-500 text-xs font-admin font-medium mt-1">{label}</p>
      {sub && <p className="text-admin-400 text-xs font-admin mt-0.5 truncate">{sub}</p>}
    </div>
  )
  return link ? <Link to={link} className="block">{inner}</Link> : inner
}

function ActionCard({ icon: Icon, label, desc, to, color = 'brand' }) {
  const colors = {
    brand:  'bg-brand-500 hover:bg-brand-600',
    red:    'bg-red-600 hover:bg-red-700',
    blue:   'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    amber:  'bg-amber-500 hover:bg-amber-600',
    green:  'bg-green-600 hover:bg-green-700',
  }[color]
  return (
    <Link to={to} className={`flex items-start gap-3 p-4 rounded-xl text-white transition-all active:scale-[0.98] ${colors}`}>
      <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon size={18} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="font-admin font-bold text-sm leading-tight">{label}</p>
        <p className="text-white/70 text-xs font-admin mt-0.5 leading-snug">{desc}</p>
      </div>
    </Link>
  )
}

function Skel({ w = 'w-20', h = 'h-4' }) {
  return <div className={`${h} ${w} bg-admin-100 rounded animate-pulse`} />
}

// Pure helper, outside the component so rendering stays free of clock reads.
const isOlderThan = (date, ms) => Boolean(date) && Date.now() - new Date(date).getTime() > ms

const LOG_COLORS = {
  auth: 'bg-blue-100 text-blue-600', order: 'bg-amber-100 text-amber-600',
  product: 'bg-brand-100 text-brand-600', stock: 'bg-green-100 text-green-600',
  payment: 'bg-purple-100 text-purple-600', account: 'bg-red-100 text-red-600',
}
const getLogColor = (action = '') => {
  if (/LOGIN|LOGOUT|AUTH/.test(action)) return LOG_COLORS.auth
  if (action.includes('ORDER')) return LOG_COLORS.order
  if (/PRODUCT|BRANCH/.test(action)) return LOG_COLORS.product
  if (action.includes('STOCK')) return LOG_COLORS.stock
  if (action.includes('PAYMENT')) return LOG_COLORS.payment
  return LOG_COLORS.account
}

const SEVERITY = {
  high:   { box: 'bg-red-50 border-red-200 text-red-800',       icon: ShieldAlert,   cls: 'text-red-600' },
  medium: { box: 'bg-amber-50 border-amber-200 text-amber-900', icon: AlertTriangle, cls: 'text-amber-600' },
}

export default function SuperAdminDashboardPage() {
  const { getChecklist } = useOnboarding()
  const [overview, setOverview] = useState(null)
  const [logs, setLogs] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    const [ov, lg] = await Promise.allSettled([
      adminControlCenterService.overview(),
      adminLogService.getLogs({ page: 1, limit: 6 }),
    ])
    if (ov.status === 'fulfilled') {
      setOverview(ov.value.data.data)
      setError('')
    } else {
      setError(ov.reason?.response?.data?.message || 'Could not load the platform overview.')
    }
    if (lg.status === 'fulfilled') setLogs(lg.value.data?.data?.logs || lg.value.data?.data || [])
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchAll()
    const timer = setInterval(() => { if (!document.hidden) fetchAll(true) }, REFRESH_MS)
    return () => clearInterval(timer)
  }, [fetchAll])

  const branches = Array.isArray(overview?.branches) ? overview.branches : []
  const active = branches.filter(b => b.isActive)
  const sum = (key) => branches.reduce((n, b) => n + (b.figures?.[key] || 0), 0)
  const pending = sum('pendingOrders')
  const pendingStale = branches.some(b => isOlderThan(b.figures?.oldestPendingAt, 24 * 3600 * 1000))
  const attention = (overview?.attention || []).filter(a => a.severity !== 'info')
  const lockedCount = branches.filter(b => b.switches?.platformLocked).length
  const dbOk = overview?.health?.database?.connected

  const checklist = getChecklist('superadmin')
  const showChecklist = checklist.length > 0 && checklist.some(item => !item.done)

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6" data-tour="superadmin-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${attention.some(a => a.severity === 'high') ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-xs font-admin font-bold text-red-600 uppercase tracking-widest">Superadmin</span>
          </div>
          <h1 className="text-2xl font-admin font-bold text-admin-900">Platform Overview</h1>
          <p className="text-admin-400 text-xs font-admin mt-0.5">
            All branches{overview ? ` · updated ${timeAgo(overview.generatedAt)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/control-center"
            className="flex items-center gap-2 px-3 py-2 bg-admin-900 text-white rounded-lg text-sm font-admin font-semibold hover:bg-admin-800 transition-colors shadow-admin">
            <Gauge size={14} aria-hidden="true" /> Control Center
          </Link>
          <button type="button" onClick={() => fetchAll(true)} disabled={refreshing} aria-label="Refresh overview"
            className="flex items-center gap-2 px-3 py-2 min-h-[40px] bg-white border border-admin-200 rounded-lg text-sm font-admin text-admin-600 hover:bg-admin-50 transition-colors shadow-admin">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-admin text-red-700">
          <span>{error}{overview ? ' Showing the last good reading.' : ''}</span>
          <button type="button" onClick={() => fetchAll(true)} className="font-semibold underline flex-shrink-0">Retry</button>
        </div>
      )}

      {/* ── What needs you (top 3; the rest live in the Control Center) ── */}
      {overview && (
        attention.length === 0 ? (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <CheckCircle2 size={18} className="text-green-600" aria-hidden="true" />
            <p className="text-sm font-admin font-semibold text-green-800">Everything is in order across all branches.</p>
          </div>
        ) : (
          <ul aria-label="Needs attention" className="mb-6 space-y-2">
            {attention.slice(0, 3).map(item => {
              const s = SEVERITY[item.severity] || SEVERITY.medium
              const Icon = s.icon
              const to = item.link?.startsWith('/') ? item.link : '/admin/control-center'
              return (
                <li key={item.id}>
                  <Link to={to} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 hover:opacity-90 ${s.box}`}>
                    <Icon size={16} className={`${s.cls} mt-0.5 flex-shrink-0`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-admin font-semibold leading-tight">{item.title}</p>
                      {item.detail && <p className="text-xs font-admin mt-0.5 opacity-80">{item.detail}</p>}
                    </div>
                    <ArrowUpRight size={14} className="opacity-50 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              )
            })}
            {attention.length > 3 && (
              <li>
                <Link to="/admin/control-center" className="text-xs font-admin font-semibold text-brand-600 hover:text-brand-700">
                  and {attention.length - 3} more in the Control Center →
                </Link>
              </li>
            )}
          </ul>
        )
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
        ) : overview ? (
          <>
            <StatCard icon={GitBranch} label="Active branches" tone={lockedCount ? 'amber' : 'brand'}
              value={`${active.length}`} link="/admin/branches"
              sub={lockedCount ? `${lockedCount} locked` : `${branches.length} in total`} />
            <StatCard icon={ShoppingCart} label="Orders today" tone="blue"
              value={sum('ordersToday')} sub="across all branches" />
            <StatCard icon={DollarSign} label="Paid revenue today" tone="green"
              value={formatKES(sum('paidRevenueToday'))} sub="payments confirmed" />
            <StatCard icon={Clock} label="Orders waiting" tone={pendingStale ? 'red' : pending ? 'amber' : 'brand'}
              value={pending} link="/admin/orders?status=pending"
              sub={pendingStale ? 'some over a day old' : 'awaiting approval'} />
          </>
        ) : null}
      </div>

      {showChecklist && (
        <div className="mb-6">
          <OnboardingChecklistCard
            eyebrow="Platform Setup"
            title="Get familiar with the control center"
            description="These steps cover the key areas of the superadmin workspace so you can manage the platform with confidence."
            items={checklist}
            theme="admin"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">

        {/* ── Branches ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden" data-tour="superadmin-branches">
          <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100">
            <div>
              <h2 className="font-admin font-bold text-admin-900">Branches</h2>
              <p className="text-admin-400 text-xs font-admin mt-0.5">{active.length} active of {branches.length} · live figures</p>
            </div>
            <Link to="/admin/branches" className="flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-admin font-semibold">
              Manage <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-admin-50">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                  <div className="w-9 h-9 bg-admin-100 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-1.5"><Skel w="w-32" /><Skel w="w-48" h="h-3" /></div>
                </div>
              ))}
            </div>
          ) : branches.length === 0 ? (
            <div className="py-12 text-center">
              <GitBranch size={28} className="text-admin-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-admin-500 font-admin font-medium mb-1">No branches yet</p>
              <Link to="/admin/branches" className="text-sm font-admin font-semibold text-brand-600 hover:text-brand-700">
                Create your first branch →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-admin-50">
              {branches.map(b => {
                const f = b.figures
                return (
                  <li key={b.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-brand-100">
                        <GitBranch size={16} className="text-brand-600" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-admin font-semibold text-admin-800 text-sm leading-tight">
                          {b.name}
                          {b.isDefault && <span className="ml-2 text-[10px] font-bold uppercase text-brand-600">Default</span>}
                        </p>
                        <p className="text-admin-400 text-xs font-admin truncate">{b.location || 'No location set'}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {!b.isActive && <span className="text-[11px] font-admin font-semibold px-2 py-0.5 rounded-full bg-admin-100 text-admin-500 border border-admin-200">Inactive</span>}
                        {b.switches?.platformLocked && <span className="text-[11px] font-admin font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">Locked</span>}
                        {b.switches?.maintenanceMode && <span className="text-[11px] font-admin font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">Maintenance</span>}
                      </div>
                    </div>
                    {f && (
                      <dl className="grid grid-cols-3 gap-2 mt-3 sm:pl-12">
                        {[
                          ['Pending', f.pendingOrders, f.pendingOrders > 0 && isOlderThan(f.oldestPendingAt, 24 * 3600 * 1000) ? 'text-red-600' : 'text-admin-800'],
                          ['Today', f.ordersToday, 'text-admin-800'],
                          ['Paid today', formatKES(f.paidRevenueToday), 'text-admin-800'],
                        ].map(([label, value, cls]) => (
                          <div key={label} className="min-w-0">
                            <dt className="text-[11px] font-admin uppercase tracking-wide text-admin-400">{label}</dt>
                            <dd className={`text-sm font-admin font-bold truncate ${cls}`}>{value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ── Quick actions ────────────────────────────────────────── */}
        <div className="space-y-2.5" data-tour="superadmin-system-controls">
          <h2 className="font-admin font-bold text-admin-900 text-sm px-1 mb-3">System Controls</h2>
          <ActionCard icon={Gauge}    label="Control Center"    desc="Health, switches, sessions, security" to="/admin/control-center" color="red" />
          <ActionCard icon={GitBranch} label="Branch Management" desc="Create, edit, assign staff" to="/admin/branches" color="brand" />
          <ActionCard icon={UserCog}  label="User Management"   desc="Accounts, roles, passwords" to="/admin/users" color="blue" />
          <ActionCard icon={Shield}   label="Activity Log"      desc="Full audit trail" to="/admin/logs" color="purple" />
          <ActionCard icon={Archive}  label="System Backups"    desc="Create, download, restore" to="/admin/backups" color="amber" />
          <ActionCard icon={Settings2} label="System Settings"  desc="Shop info, payments, maintenance" to="/admin/settings" color="green" />

          <div className="pt-2 border-t border-admin-100">
            <p className="text-[10px] font-admin font-bold text-admin-400 uppercase tracking-widest px-1 mb-2">Observe (View Only)</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: ShoppingCart, label: 'Orders',   to: '/admin/orders' },
                { icon: Package,      label: 'Products', to: '/admin/products' },
                { icon: Layers,       label: 'Stock',    to: '/admin/stock' },
                { icon: TrendingUp,   label: 'Reports',  to: '/admin/reports' },
              ].map(({ icon: Icon, label, to }) => (
                <Link key={to} to={to}
                  className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl bg-white border border-admin-200 text-admin-600
                    hover:border-admin-300 hover:text-admin-800 text-xs font-admin font-medium transition-all shadow-admin">
                  <Icon size={13} className="text-admin-400 flex-shrink-0" aria-hidden="true" />
                  {label}
                  <Eye size={11} className="text-admin-300 ml-auto flex-shrink-0" aria-label="view only" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── System status strip ──────────────────────────────────────── */}
      {overview && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 bg-white rounded-xl border border-admin-200 shadow-admin px-4 py-3">
            <Database size={16} className={dbOk ? 'text-green-600' : 'text-red-600'} aria-hidden="true" />
            <p className="text-sm font-admin text-admin-700">Database <strong>{dbOk ? 'connected' : 'DOWN'}</strong></p>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-xl border border-admin-200 shadow-admin px-4 py-3">
            <Archive size={16} className={overview.backups?.latestBackupAt ? 'text-green-600' : 'text-red-600'} aria-hidden="true" />
            <p className="text-sm font-admin text-admin-700">
              {overview.backups?.error ? 'Backups unreadable'
                : overview.backups?.latestBackupAt ? <>Last backup <strong>{timeAgo(overview.backups.latestBackupAt)}</strong></>
                : <strong>No backup yet</strong>}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-xl border border-admin-200 shadow-admin px-4 py-3">
            <UserCog size={16} className="text-admin-500" aria-hidden="true" />
            <p className="text-sm font-admin text-admin-700">
              {overview.accounts?.error ? 'Accounts unreadable'
                : <><strong>{overview.accounts.signedInToday}</strong> staff signed in today</>}
            </p>
          </div>
        </div>
      )}

      {/* ── Recent Activity ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden" data-tour="superadmin-activity">
        <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100">
          <div>
            <h2 className="font-admin font-bold text-admin-900">Recent Activity</h2>
            <p className="text-admin-400 text-xs font-admin mt-0.5">System-wide audit trail</p>
          </div>
          <Link to="/admin/logs" className="flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-admin font-semibold">
            Full log <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="divide-y divide-admin-50">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <div className="w-8 h-8 bg-admin-100 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5"><Skel w="w-40" /><Skel w="w-24" h="h-3" /></div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center">
            <Activity size={24} className="text-admin-300 mx-auto mb-2" aria-hidden="true" />
            <p className="text-admin-400 text-sm font-admin">No activity yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-admin-50">
            {logs.map((log, i) => {
              const actor = log.actorId?.name || log.actorName || log.actor || 'System'
              return (
                <li key={log._id || i} className="flex items-center gap-3 px-5 py-3">
                  <div aria-hidden="true" className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-admin font-bold ${getLogColor(log.action)}`}>
                    {actor.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-admin-800 text-xs font-admin font-semibold leading-tight">
                      {actor}
                      <span className="text-admin-400 font-normal ml-1.5">{(log.action || '').toLowerCase().replace(/_/g, ' ')}</span>
                    </p>
                    {log.detail && typeof log.detail === 'string' && (
                      <p className="text-admin-400 text-xs font-admin mt-0.5 truncate">{log.detail}</p>
                    )}
                  </div>
                  <p className="text-admin-300 text-xs font-admin flex-shrink-0">{timeAgo(log.timestamp || log.createdAt)}</p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
