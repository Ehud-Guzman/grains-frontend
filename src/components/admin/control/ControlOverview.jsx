import { Link } from 'react-router-dom'
import { Activity, CheckCircle2, GitBranch, ArrowUpRight } from 'lucide-react'
import { formatKES, timeAgo } from '../../../utils/helpers'
import { Section, Pill, Stat, StatusDot, SectionError, severityStyle, formatBytes, formatUptime, isOlderThan } from './controlUi'

// Where an attention item sends you. A leading slash is another page; anything else is
// a section on this one.
const targetFor = (link) => {
  if (!link) return null
  if (link === 'branches') return { to: '/admin/branches' }
  if (link.startsWith('/')) return { to: link }
  return { href: `#${link}` }
}

function AttentionItem({ item }) {
  const s = severityStyle(item.severity)
  const Icon = s.icon
  const target = targetFor(item.link)
  const body = (
    <div className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${s.box}`}>
      <Icon size={16} className={`${s.iconCls} mt-0.5 flex-shrink-0`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-admin font-semibold leading-tight ${s.text}`}>
          <span className="sr-only">{s.label}: </span>{item.title}
        </p>
        {item.detail && <p className={`text-xs font-admin mt-0.5 leading-relaxed ${s.sub}`}>{item.detail}</p>}
      </div>
      {target && <ArrowUpRight size={14} className="text-admin-400 mt-0.5 flex-shrink-0" aria-hidden="true" />}
    </div>
  )
  if (target?.to) return <Link to={target.to} className="block hover:opacity-90">{body}</Link>
  if (target?.href) return <a href={target.href} className="block hover:opacity-90">{body}</a>
  return body
}

function BranchCard({ branch }) {
  const f = branch.figures
  return (
    <div className="min-w-0 rounded-xl border border-admin-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <GitBranch size={16} className="text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="font-admin font-bold text-admin-900 text-sm leading-tight truncate">{branch.name}</p>
            <p className="text-xs font-admin text-admin-400 truncate">{branch.location || 'No location set'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {branch.isDefault && <Pill tone="brand">Default</Pill>}
          {!branch.isActive && <Pill>Inactive</Pill>}
          {branch.switches.platformLocked && <Pill tone="red">Locked</Pill>}
          {branch.switches.maintenanceMode && <Pill tone="amber">Maintenance</Pill>}
        </div>
      </div>

      {f ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Stat label="Pending orders" value={f.pendingOrders}
            tone={isOlderThan(f.oldestPendingAt, 24 * 3600 * 1000) ? 'red' : undefined}
            sub={f.oldestPendingAt ? `oldest ${timeAgo(f.oldestPendingAt)}` : 'none waiting'} />
          <Stat label="Orders today" value={f.ordersToday} sub={`${formatKES(f.paidRevenueToday)} paid`} />
          <Stat label="Cash to confirm" value={f.codUnsettledCount} tone={f.codUnsettledCount ? 'amber' : undefined}
            sub={f.codUnsettledCount ? formatKES(f.codUnsettledAmount) : 'all settled'} />
          <Stat label="Low / out of stock" value={f.lowStockLines} tone={f.lowStockLines ? 'amber' : undefined} sub="product lines" />
          <Stat label="eTIMS failed" value={f.etimsFailed} tone={f.etimsFailed ? 'amber' : undefined} />
          <Stat label="Map coordinates" value={branch.hasCoordinates ? 'Set' : 'Missing'} tone={branch.hasCoordinates ? undefined : 'amber'} />
        </div>
      ) : (
        <SectionError message="Figures for this branch could not be read." />
      )}
    </div>
  )
}

export default function ControlOverview({ overview }) {
  const { health, attention, branches, accounts, backups, security } = overview
  const high = attention.filter(a => a.severity === 'high').length

  return (
    <div className="space-y-5">
      <Section id="overview" icon={Activity} title="What needs you"
        subtitle={attention.length ? `${attention.length} item${attention.length === 1 ? '' : 's'}${high ? `, ${high} urgent` : ''}` : 'Everything is in order'}>
        {attention.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <CheckCircle2 size={18} className="text-green-600" />
            <p className="text-sm font-admin font-semibold text-green-800">Nothing needs your attention right now.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {attention.map(item => <li key={item.id}><AttentionItem item={item} /></li>)}
          </ul>
        )}
      </Section>

      <Section id="health" icon={Activity} title="System health" subtitle="The server, the database and how it is configured">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-5">
          <Stat label="Database" value={health.database.connected ? 'Connected' : 'DOWN'} tone={health.database.connected ? undefined : 'red'} sub={health.database.name} />
          <Stat label="Server" value={formatUptime(health.api.uptimeSeconds)} sub={`${health.api.environment} · ${health.api.memoryMb} MB`} />
          <Stat label="Backups"
            value={backups?.error ? '—' : backups.total}
            tone={!backups?.error && backups.total === 0 ? 'red' : undefined}
            sub={backups?.error ? 'unreadable' : backups.latestBackupAt ? `latest ${timeAgo(backups.latestBackupAt)}` : 'none yet'} />
          <Stat label="Sign-ins (24h)" value={security?.error ? '—' : `${security.failedLogins24h} failed`}
            tone={!security?.error && security.failedLogins24h >= 10 ? 'amber' : undefined}
            sub={accounts?.error ? '' : `${accounts.signedInToday} staff signed in today`} />
        </div>

        <ul className="divide-y divide-admin-100 rounded-lg border border-admin-100">
          {health.config.map(check => (
            <li key={check.id} className="flex items-start gap-3 px-3 py-2.5">
              <div className="mt-0.5"><StatusDot ok={check.ok || check.severity === 'info'} label={check.ok ? 'OK' : 'Needs attention'} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-admin font-semibold text-admin-800">
                  {check.label} <span className="font-normal text-admin-400">· {check.value}</span>
                </p>
                <p className="text-xs font-admin text-admin-400 mt-0.5 leading-relaxed">{check.note}</p>
              </div>
            </li>
          ))}
        </ul>
        {backups && !backups.error && backups.total > 0 && (
          <p className="text-xs font-admin text-admin-400 mt-3">
            {backups.total} backup{backups.total === 1 ? '' : 's'} on this server, {formatBytes(backups.totalSizeBytes)}{backups.encrypted ? ', encrypted' : ''}.
          </p>
        )}
      </Section>

      <Section id="branches" icon={GitBranch} title="Branches at a glance" subtitle="Live figures from every branch"
        actions={<Link to="/admin/branches" className="text-xs font-admin font-semibold text-brand-600 hover:text-brand-700">Manage branches →</Link>}>
        {branches?.error ? <SectionError message={branches.error} /> : (
          branches.length === 0
            ? <p className="text-sm font-admin text-admin-400">No branches yet.</p>
            : <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{branches.map(b => <BranchCard key={b.id} branch={b} />)}</div>
        )}
      </Section>
    </div>
  )
}
