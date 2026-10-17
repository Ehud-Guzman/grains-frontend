import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ShieldAlert, Download, ChevronDown } from 'lucide-react'
import { adminControlCenterService as api } from '../../../services/admin/controlCenter.service'
import { formatDateTime, timeAgo } from '../../../utils/helpers'
import { Section, Pill, Loading, SectionError, errorMessage, actionLabel } from './controlUi'

const ACTION_TONE = (action) => {
  if (action === 'FAILED_LOGIN' || (action.includes('LOCKED') && !action.includes('UNLOCKED'))) return 'red'
  if (action.startsWith('CONTROL_') || action.startsWith('PLATFORM_')) return 'purple'
  if (action.includes('BACKUP') || action.includes('ROLE') || action.includes('PASSWORD') || action.includes('PERMISSION')) return 'amber'
  return 'gray'
}

// Small summaries for the entries whose detail is worth a line without opening them.
const summarise = (event) => {
  const d = event.detail || {}
  if (d.changes) return Object.entries(d.changes).map(([k, v]) => `${k}: ${v.from} → ${v.to}`).join(', ')
  if (d.previousRole) return `${d.name}: ${d.previousRole} → ${d.newRole}`
  if (d.scope) return `scope: ${d.scope}${d.accounts != null ? `, ${d.accounts} account(s)` : ''}`
  if (d.job) return d.label || d.job
  if (d.phone) return d.phone
  if (d.name) return d.name
  return ''
}

function Entry({ event }) {
  const [open, setOpen] = useState(false)
  const [raw, setRaw] = useState(null)
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next && !raw) {
      setBusy(true)
      try {
        const res = await api.rawEntry(event.id)
        setRaw(res.data.data)
      } catch (err) {
        toast.error(errorMessage(err, 'Could not load the entry'))
        setOpen(false)
      } finally {
        setBusy(false)
      }
    }
  }

  const line = summarise(event)
  return (
    <li className="py-2.5">
      <button type="button" onClick={toggle} aria-expanded={open}
        className="w-full flex items-start gap-3 text-left">
        <ChevronDown size={14} className={`mt-1 text-admin-300 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-admin text-admin-800 flex flex-wrap items-center gap-1.5">
            <Pill tone={ACTION_TONE(event.action)}>{actionLabel(event.action)}</Pill>
            <span className="font-semibold">{event.actorName || 'Unknown'}</span>
            {event.branchName && <span className="text-admin-400">· {event.branchName}</span>}
          </p>
          {line && <p className="text-xs font-admin text-admin-500 mt-0.5 truncate">{line}</p>}
        </div>
        <span className="text-xs font-admin text-admin-400 flex-shrink-0" title={formatDateTime(event.timestamp)}>
          {timeAgo(event.timestamp)}
        </span>
      </button>
      {open && (
        <div className="mt-2 ml-7 rounded-lg bg-admin-900 text-admin-100 p-3 overflow-x-auto">
          {busy ? <span className="text-xs font-admin">Loading…</span> : (
            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-all">{JSON.stringify(raw, null, 2)}</pre>
          )}
        </div>
      )}
    </li>
  )
}

export default function ControlSecurity() {
  const [days, setDays] = useState(7)
  const [feed, setFeed] = useState(null)
  const [error, setError] = useState('')
  const [range, setRange] = useState({ from: '', to: '' })
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.security(days)
      setFeed(res.data.data)
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Could not load security events'))
    }
  }, [days])

  useEffect(() => { load() }, [load])

  const exportCsv = async () => {
    setExporting(true)
    try {
      const params = {}
      if (range.from) params.from = new Date(`${range.from}T00:00:00+03:00`).toISOString()
      if (range.to) params.to = new Date(`${range.to}T23:59:59+03:00`).toISOString()
      const res = await api.exportAudit(params)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Activity log exported')
    } catch (err) {
      // A blob error body has to be read as text to get the server's message.
      let message = 'Export failed'
      try { message = JSON.parse(await err.response.data.text()).message || message } catch { /* keep default */ }
      toast.error(message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Section id="security" icon={ShieldAlert} title="Security and audit"
      subtitle="Sign-in failures, account changes and the Control Center's own actions. Click an entry to read it raw."
      actions={
        <div className="flex rounded-lg border border-admin-200 overflow-hidden" role="group" aria-label="Time window">
          {[1, 7, 30].map(d => (
            <button key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d}
              className={`px-3 py-1.5 text-xs font-admin font-semibold ${days === d ? 'bg-admin-900 text-white' : 'bg-white text-admin-600 hover:bg-admin-50'}`}>
              {d === 1 ? '24h' : `${d} days`}
            </button>
          ))}
        </div>
      }>
      {error && !feed && <SectionError message={error} onRetry={load} />}
      {!error && !feed && <Loading label="Reading the activity log…" />}

      {feed && (
        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-admin font-bold uppercase tracking-wide text-admin-500 mb-2">Failed sign-ins by address</h3>
              {feed.failedLoginsByIp.length === 0
                ? <p className="text-sm font-admin text-admin-400">None in this window.</p>
                : (
                  <ul className="divide-y divide-admin-100 rounded-lg border border-admin-100">
                    {feed.failedLoginsByIp.map(r => (
                      <li key={r.ip} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-admin font-semibold text-admin-800">{r.ip}</p>
                          <p className="text-xs font-admin text-admin-400">{r.accounts} account{r.accounts === 1 ? '' : 's'} · last {timeAgo(r.lastAt)}</p>
                        </div>
                        <Pill tone={r.attempts >= 10 ? 'red' : r.attempts >= 4 ? 'amber' : 'gray'}>{r.attempts}</Pill>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
            <div>
              <h3 className="text-xs font-admin font-bold uppercase tracking-wide text-admin-500 mb-2">Failed sign-ins by account</h3>
              {feed.failedLoginsByAccount.length === 0
                ? <p className="text-sm font-admin text-admin-400">None in this window.</p>
                : (
                  <ul className="divide-y divide-admin-100 rounded-lg border border-admin-100">
                    {feed.failedLoginsByAccount.map(r => (
                      <li key={String(r.accountId)} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-admin font-semibold text-admin-800">{r.name}</p>
                          <p className="text-xs font-admin text-admin-400">{r.role || 'unknown role'} · last {timeAgo(r.lastAt)}</p>
                        </div>
                        <Pill tone={r.attempts >= 10 ? 'red' : r.attempts >= 4 ? 'amber' : 'gray'}>{r.attempts}</Pill>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-admin font-bold uppercase tracking-wide text-admin-500 mb-1">Recent events</h3>
            {feed.events.length === 0
              ? <p className="text-sm font-admin text-admin-400">No security events in this window.</p>
              : <ul className="divide-y divide-admin-100">{feed.events.map(e => <Entry key={e.id} event={e} />)}</ul>}
          </div>

          <div className="rounded-lg border border-admin-100 bg-admin-50/50 p-3">
            <h3 className="text-xs font-admin font-bold uppercase tracking-wide text-admin-500 mb-2">Export the full activity log</h3>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-admin text-admin-600">
                From
                <input type="date" value={range.from} onChange={(e) => setRange(r => ({ ...r, from: e.target.value }))}
                  className="mt-1 block border border-admin-200 rounded-lg px-2.5 py-1.5 text-sm font-admin bg-white" />
              </label>
              <label className="text-xs font-admin text-admin-600">
                To
                <input type="date" value={range.to} onChange={(e) => setRange(r => ({ ...r, to: e.target.value }))}
                  className="mt-1 block border border-admin-200 rounded-lg px-2.5 py-1.5 text-sm font-admin bg-white" />
              </label>
              <button type="button" onClick={exportCsv} disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-admin-900 text-white text-sm font-admin font-semibold disabled:opacity-50">
                <Download size={14} /> {exporting ? 'Exporting…' : 'Download CSV'}
              </button>
            </div>
            <p className="text-xs font-admin text-admin-400 mt-2">
              Every export is itself recorded in the log. Entries older than each branch’s retention period have already been removed.
            </p>
          </div>
        </div>
      )}
    </Section>
  )
}
