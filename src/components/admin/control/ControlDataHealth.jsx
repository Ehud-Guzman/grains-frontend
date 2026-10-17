import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Archive, ScanSearch, CheckCircle2, ArrowUpRight } from 'lucide-react'
import { adminControlCenterService as api } from '../../../services/admin/controlCenter.service'
import { adminBackupService } from '../../../services/admin/backup.service'
import { timeAgo } from '../../../utils/helpers'
import { Section, Stat, Pill, Loading, SectionError, errorMessage, formatBytes, severityStyle, isOlderThan } from './controlUi'

function BackupSummary({ backups, reload }) {
  const [busy, setBusy] = useState(false)

  const create = async () => {
    setBusy(true)
    try {
      await adminBackupService.create()
      toast.success('Backup created')
      await reload()
    } catch (err) {
      toast.error(errorMessage(err, 'Backup failed'))
    } finally {
      setBusy(false)
    }
  }

  if (backups?.error) return <SectionError message={backups.error} onRetry={reload} />
  const stale = isOlderThan(backups.latestBackupAt, 7 * 24 * 3600 * 1000)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Stat label="Backups kept" value={backups.total} tone={backups.total === 0 ? 'red' : undefined} />
        <Stat label="Latest" value={backups.latestBackupAt ? timeAgo(backups.latestBackupAt) : 'Never'}
          tone={!backups.latestBackupAt ? 'red' : stale ? 'amber' : undefined} />
        <Stat label="Size on disk" value={formatBytes(backups.totalSizeBytes)} />
        <Stat label="Encryption" value={backups.encrypted ? 'On' : 'Off'} tone={backups.encrypted ? undefined : 'amber'} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={create} disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-admin-900 text-white text-sm font-admin font-semibold disabled:opacity-50">
          <Archive size={14} /> {busy ? 'Backing up…' : 'Back up now'}
        </button>
        <Link to="/admin/backups" className="text-xs font-admin font-semibold text-brand-600 hover:text-brand-700">
          Download, restore or delete backups →
        </Link>
      </div>
      <p className="text-xs font-admin text-admin-400">
        Backups here are made by hand — nothing schedules them. Make one before anything risky, and keep a copy off the server.
      </p>
    </div>
  )
}

function Check({ check }) {
  const s = severityStyle(check.ok ? 'info' : check.severity)
  return (
    <li className={`rounded-lg border px-3 py-2.5 ${check.ok ? 'border-admin-100 bg-white' : s.box}`}>
      <div className="flex items-start gap-2.5">
        {check.ok
          ? <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
          : <s.icon size={16} className={`${s.iconCls} mt-0.5 flex-shrink-0`} />}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-admin font-semibold ${check.ok ? 'text-admin-700' : s.text}`}>
            {check.title}
            {!check.ok && !check.error && <span className="ml-2"><Pill tone={check.severity === 'high' ? 'red' : 'amber'}>{check.count}</Pill></span>}
          </p>
          {check.error && <p className="text-xs font-admin text-red-700 mt-0.5">{check.error}</p>}
          {!check.ok && !check.error && (
            <>
              <p className={`text-xs font-admin mt-0.5 leading-relaxed ${s.sub}`}>{check.hint}</p>
              <ul className="mt-2 space-y-1">
                {check.examples.map(ex => (
                  <li key={ex.id} className="text-xs font-admin text-admin-700 flex flex-wrap items-center gap-x-2">
                    {ex.link
                      ? <Link to={ex.link} className="font-semibold text-brand-700 hover:underline inline-flex items-center gap-0.5">{ex.label}<ArrowUpRight size={11} /></Link>
                      : <span className="font-semibold">{ex.label}</span>}
                    <span className="text-admin-500">{ex.detail}</span>
                  </li>
                ))}
                {check.count > check.examples.length && (
                  <li className="text-xs font-admin text-admin-400">…and {check.count - check.examples.length} more</li>
                )}
              </ul>
            </>
          )}
        </div>
      </div>
    </li>
  )
}

export default function ControlDataHealth({ overview, reload }) {
  const [scan, setScan] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setScanning(true)
    setError('')
    try {
      const res = await api.integrity()
      setScan(res.data.data)
    } catch (err) {
      setError(errorMessage(err, 'The scan could not run'))
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="space-y-5">
      <Section id="data" icon={Archive} title="Backups" subtitle="Your safety net, and whether it is there when you need it">
        <BackupSummary backups={overview.backups} reload={reload} />
      </Section>

      <Section id="integrity" icon={ScanSearch} title="Data integrity scan"
        subtitle="Looks for stock, payments, accounts and branches that disagree with each other. Read-only: it never changes anything."
        actions={
          <button type="button" onClick={run} disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-admin-200 bg-white text-sm font-admin font-semibold text-admin-700 hover:bg-admin-50 disabled:opacity-50">
            <ScanSearch size={14} /> {scanning ? 'Scanning…' : scan ? 'Scan again' : 'Run scan'}
          </button>
        }>
        {error && <SectionError message={error} onRetry={run} />}
        {scanning && !scan && <Loading label="Checking the books…" />}
        {!scan && !scanning && !error && (
          <p className="text-sm font-admin text-admin-400">Not run yet. It takes a few seconds and is safe to run any time.</p>
        )}
        {scan && (
          <div className="space-y-3">
            <p className="text-sm font-admin text-admin-600">
              {scan.problems === 0
                ? <strong className="text-green-700">All {scan.checks.length} checks passed.</strong>
                : <><strong className="text-amber-700">{scan.problems} of {scan.checks.length} checks found something.</strong></>}
              <span className="text-admin-400"> Ran {timeAgo(scan.ranAt)} in {scan.durationMs} ms.</span>
            </p>
            <ul className="space-y-2">
              {[...scan.checks].sort((a, b) => Number(a.ok) - Number(b.ok)).map(c => <Check key={c.id} check={c} />)}
            </ul>
          </div>
        )}
      </Section>
    </div>
  )
}
