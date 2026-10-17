import { useState } from 'react'
import toast from 'react-hot-toast'
import { SlidersHorizontal, Lock, Unlock, Timer } from 'lucide-react'
import { adminControlCenterService as api } from '../../../services/admin/controlCenter.service'
import { timeAgo } from '../../../utils/helpers'
import { Section, Toggle, Pill, PasswordConfirmModal, SectionError, errorMessage } from './controlUi'

const GROUPS = [
  { id: 'emergency', title: 'Emergency' },
  { id: 'checkout', title: 'Checkout' },
  { id: 'messages', title: 'Messages' },
  { id: 'accounts', title: 'Accounts (read from the default branch)' },
]

function MaintenanceMessage({ branch, onSave }) {
  const [text, setText] = useState(branch.maintenanceMessage || '')
  const [busy, setBusy] = useState(false)
  const dirty = text.trim() !== (branch.maintenanceMessage || '').trim()

  const save = async () => {
    setBusy(true)
    try {
      await onSave({ maintenanceMessage: text })
      toast.success('Maintenance message saved')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save the message'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="py-2.5">
      <label htmlFor={`msg-${branch.id}`} className="text-xs font-admin font-semibold text-admin-600">
        Message customers see during maintenance
      </label>
      <textarea
        id={`msg-${branch.id}`}
        rows={2}
        maxLength={300}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-1 w-full border border-admin-200 rounded-lg px-3 py-2 text-sm font-admin focus:outline-none focus:ring-2 focus:ring-brand-300"
      />
      <div className="flex items-center justify-between mt-1">
        <span className="text-[11px] font-admin text-admin-400">{text.length}/300</span>
        <button type="button" onClick={save} disabled={!dirty || busy}
          className="text-xs font-admin font-semibold px-3 py-1.5 rounded-lg bg-admin-900 text-white disabled:opacity-40">
          Save message
        </button>
      </div>
    </div>
  )
}

function BranchSwitches({ branch, definitions, reload }) {
  const [busyKey, setBusyKey] = useState(null)
  const [pendingGuarded, setPendingGuarded] = useState(null) // { key, value }

  const apply = async (patch, password) => {
    const res = await api.setSwitches(branch.id, patch, password)
    await reload()
    return res
  }

  const change = async (def, value) => {
    // The two emergency levers ask for the password; everything else is one tap.
    if (def.risky) {
      setPendingGuarded({ def, value })
      return
    }
    setBusyKey(def.key)
    try {
      await apply({ [def.key]: value })
      toast.success(`${def.label} ${value ? 'on' : 'off'} — ${branch.name}`)
    } catch (err) {
      toast.error(errorMessage(err, `Could not change ${def.label}`))
    } finally {
      setBusyKey(null)
    }
  }

  const visible = definitions.filter(d => !d.global || branch.isDefault)

  return (
    <div className="rounded-xl border border-admin-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h3 className="font-admin font-bold text-admin-900 text-sm">{branch.name}</h3>
        <div className="flex gap-1">
          {branch.isDefault && <Pill tone="brand">Default</Pill>}
          {!branch.isActive && <Pill>Inactive</Pill>}
        </div>
      </div>

      {GROUPS.map(group => {
        const items = visible.filter(d => d.group === group.id)
        if (items.length === 0) return null
        return (
          <div key={group.id} className="border-t border-admin-100 first:border-t-0 pt-2 mt-2">
            <p className="text-[10px] font-admin font-bold uppercase tracking-widest text-admin-400">{group.title}</p>
            <div className="divide-y divide-admin-50">
              {items.map(def => (
                <Toggle key={def.key} label={def.label} description={def.description}
                  checked={branch.switches[def.key]} busy={busyKey === def.key}
                  danger={def.risky}
                  onChange={(value) => change(def, value)} />
              ))}
            </div>
            {group.id === 'emergency' && <MaintenanceMessage key={branch.maintenanceMessage} branch={branch} onSave={apply} />}
          </div>
        )
      })}

      {pendingGuarded && (
        <PasswordConfirmModal
          title={`${pendingGuarded.value ? 'Turn on' : 'Turn off'} “${pendingGuarded.def.label}”`}
          confirmLabel={pendingGuarded.value ? 'Turn on' : 'Turn off'}
          danger={pendingGuarded.value}
          onClose={() => setPendingGuarded(null)}
          onConfirm={async (password) => {
            await apply({ [pendingGuarded.def.key]: pendingGuarded.value }, password)
            toast.success(`${pendingGuarded.def.label} ${pendingGuarded.value ? 'on' : 'off'} — ${branch.name}`)
          }}
        >
          <p><strong>{branch.name}.</strong> {pendingGuarded.def.description}</p>
        </PasswordConfirmModal>
      )}
    </div>
  )
}

function Jobs({ jobs, reload }) {
  const [busy, setBusy] = useState(null)

  if (jobs?.error) return <SectionError message={jobs.error} onRetry={reload} />

  const toggle = async (job) => {
    setBusy(job.name)
    try {
      await api.setJobPaused(job.name, !job.paused)
      await reload()
      toast.success(`${job.label} ${job.paused ? 'resumed' : 'paused'}`)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not change the job'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <ul className="divide-y divide-admin-100 rounded-lg border border-admin-100">
      {jobs.map(job => (
        <li key={job.name} className="px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-admin font-semibold text-admin-800">
                {job.label} <span className="font-normal text-admin-400">· {job.schedule}</span>
              </p>
              <p className="text-xs font-admin text-admin-400 mt-0.5 leading-relaxed">{job.description}</p>
              <p className="text-xs font-admin mt-1.5 flex flex-wrap items-center gap-1.5">
                {job.paused && <Pill tone="amber">Paused</Pill>}
                {job.lastRun ? (
                  <>
                    <Pill tone={job.lastRun.outcome === 'ok' ? 'green' : job.lastRun.outcome === 'failed' ? 'red' : 'gray'}>
                      {job.lastRun.outcome === 'ok' ? 'Ran' : job.lastRun.outcome === 'failed' ? 'Failed' : 'Skipped'}
                    </Pill>
                    <span className="text-admin-400">{timeAgo(job.lastRun.finishedAt)}</span>
                    {job.lastRun.error && <span className="text-red-600">{job.lastRun.error}</span>}
                  </>
                ) : (
                  <span className="text-admin-400">Not run since the server last started</span>
                )}
              </p>
              {job.paused && <p className="text-xs font-admin text-amber-700 mt-1">{job.pauseEffect}</p>}
            </div>
            <Toggle label={job.paused ? 'Paused' : 'Running'} checked={!job.paused} busy={busy === job.name}
              onChange={() => toggle(job)} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function ControlSwitches({ overview, reload }) {
  const [lockAll, setLockAll] = useState(null) // true | false | null
  const branches = Array.isArray(overview.branches) ? overview.branches : []
  const active = branches.filter(b => b.isActive)
  const allLocked = active.length > 0 && active.every(b => b.switches.platformLocked)

  return (
    <div className="space-y-5">
      <Section id="switches" icon={SlidersHorizontal} title="Switches"
        subtitle="What each branch allows. Changes apply at once and are written to the activity log."
        actions={
          allLocked ? (
            <button type="button" onClick={() => setLockAll(false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-admin-200 text-sm font-admin font-semibold text-admin-700 hover:bg-admin-50">
              <Unlock size={14} /> Unlock every branch
            </button>
          ) : (
            <button type="button" onClick={() => setLockAll(true)} disabled={active.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-admin font-semibold hover:bg-red-700 disabled:opacity-40">
              <Lock size={14} /> Lock every branch
            </button>
          )
        }>
        {overview.branches?.error ? <SectionError message={overview.branches.error} onRetry={reload} /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {branches.map(b => <BranchSwitches key={b.id} branch={b} definitions={overview.switchDefinitions} reload={reload} />)}
          </div>
        )}
        <p className="text-xs font-admin text-admin-400 mt-4 leading-relaxed">
          A locked branch is frozen, not hidden: staff can still read everything. M-Pesa confirmations from Safaricom
          are never blocked, so money that has already moved is always recorded.
        </p>
      </Section>

      <Section id="jobs" icon={Timer} title="Scheduled jobs"
        subtitle="Background work the server does on its own. Pause one to stop it without redeploying.">
        <Jobs jobs={overview.jobs} reload={reload} />
        <p className="text-xs font-admin text-admin-400 mt-3">
          Run records cover the time since the server last started. The keep-alive pinger is not listed: pausing it would let the host put the server to sleep.
        </p>
      </Section>

      {lockAll !== null && (
        <PasswordConfirmModal
          title={lockAll ? 'Lock every branch' : 'Unlock every branch'}
          confirmLabel={lockAll ? 'Lock everything' : 'Unlock everything'}
          danger={lockAll}
          onClose={() => setLockAll(null)}
          onConfirm={async (password) => {
            await api.lockAll(lockAll, password)
            await reload()
            toast.success(lockAll ? 'Every branch is locked' : 'Every branch is unlocked')
          }}
        >
          {lockAll
            ? <p>Staff, supervisors, admins and drivers on <strong>every active branch</strong> will be able to read but not change anything, and customers cannot place orders. Use this if you suspect a compromised account.</p>
            : <p>Every active branch goes back to normal operation.</p>}
        </PasswordConfirmModal>
      )}
    </div>
  )
}
