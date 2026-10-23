import { useId, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from 'lucide-react'
import Modal from '../../ui/Modal'
import Spinner from '../../ui/Spinner'

// Shared building blocks for the Control Center sections.

// The server's message when it has one, else the fallback. Network failures have no body.
export const errorMessage = (err, fallback) => err?.response?.data?.message || fallback

// ── SECTION ───────────────────────────────────────────────────────────────────
export function Section({ id, icon: Icon, title, subtitle, actions, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`}
      className="bg-white rounded-xl border border-admin-200 shadow-admin scroll-mt-24">
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 sm:px-5 py-4 border-b border-admin-100">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-admin-50 border border-admin-100 flex items-center justify-center flex-shrink-0">
              <Icon size={17} className="text-admin-600" />
            </div>
          )}
          <div className="min-w-0">
            <h2 id={`${id}-title`} className="font-admin font-bold text-admin-900 leading-tight">{title}</h2>
            {subtitle && <p className="text-xs font-admin text-admin-500 mt-0.5 leading-relaxed">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

// ── SMALL PARTS ───────────────────────────────────────────────────────────────
const SEVERITY = {
  high:   { label: 'Needs you', box: 'bg-red-50 border-red-200',     text: 'text-red-800',   sub: 'text-red-700',   icon: ShieldAlert,   iconCls: 'text-red-600' },
  medium: { label: 'Look soon', box: 'bg-amber-50 border-amber-200', text: 'text-amber-900', sub: 'text-amber-800', icon: AlertTriangle, iconCls: 'text-amber-600' },
  info:   { label: 'FYI',       box: 'bg-admin-50 border-admin-200', text: 'text-admin-800', sub: 'text-admin-600', icon: Info,          iconCls: 'text-admin-500' },
}
export const severityStyle = (severity) => SEVERITY[severity] || SEVERITY.info

export function Pill({ tone = 'gray', children }) {
  const tones = {
    gray:   'bg-admin-100 text-admin-600 border-admin-200',
    green:  'bg-green-50 text-green-700 border-green-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    amber:  'bg-amber-50 text-amber-800 border-amber-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    brand:  'bg-brand-50 text-brand-700 border-brand-200',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-admin font-semibold px-2 py-0.5 rounded-full border ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  )
}

export const ROLE_TONE = { superadmin: 'red', admin: 'brand', supervisor: 'purple', staff: 'blue', driver: 'amber', customer: 'gray' }

export function StatusDot({ ok, label }) {
  return ok
    ? <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" aria-label={label || 'OK'} />
    : <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" aria-label={label || 'Needs attention'} />
}

export function Stat({ label, value, sub, tone }) {
  const color = tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : 'text-admin-900'
  return (
    <div className="rounded-lg border border-admin-100 bg-admin-50/50 px-3 py-2.5 min-w-0">
      <p className={`text-lg font-admin font-bold leading-tight truncate ${color}`}>{value}</p>
      <p className="text-[11px] font-admin font-semibold uppercase tracking-wide text-admin-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] font-admin text-admin-500 mt-0.5 truncate">{sub}</p>}
    </div>
  )
}

export function SectionError({ message, onRetry }) {
  return (
    <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
      <p className="text-sm font-admin text-red-700">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="text-xs font-admin font-semibold text-red-700 underline flex-shrink-0">
          Retry
        </button>
      )}
    </div>
  )
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-3 py-6 justify-center text-admin-500 text-sm font-admin">
      <Spinner size="sm" /> {label}
    </div>
  )
}

// ── SWITCH ────────────────────────────────────────────────────────────────────
// An accessible on/off control. `busy` freezes it while the request is in flight so a
// double tap can't send two opposite changes.
export function Toggle({ checked, onChange, label, description, disabled, busy, danger }) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-admin font-semibold text-admin-800 cursor-pointer">{label}</label>
        {description && <p className="text-xs font-admin text-admin-500 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled || busy}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors
          focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${checked ? (danger ? 'bg-red-500' : 'bg-green-500') : 'bg-admin-300'}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

// ── CONFIRM WITH PASSWORD ─────────────────────────────────────────────────────
// For actions with a wide blast radius. `onConfirm(password)` should throw (or reject)
// on failure; the server's message is shown in the dialog so a mistyped password can be
// corrected without losing the context.
export function PasswordConfirmModal({ title, children, confirmLabel = 'Confirm', danger = false, onConfirm, onClose }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setError('')
    try {
      await onConfirm(password)
      onClose()
    } catch (err) {
      setError(errorMessage(err, 'That did not work. Nothing was changed.'))
      setPassword('')
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  return (
    <Modal onClose={busy ? undefined : onClose} label={title} initialFocusRef={inputRef} dismissOnBackdrop={false}
      panelClassName="bg-white w-full sm:max-w-md rounded-2xl shadow-2xl border border-admin-100">
      <form onSubmit={submit}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
              <ShieldAlert size={15} className={danger ? 'text-red-600' : 'text-amber-600'} />
            </div>
            <h3 className="font-admin font-bold text-admin-900 text-sm">{title}</h3>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-admin-100 text-admin-500 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="text-sm font-admin text-admin-600 leading-relaxed">{children}</div>
          <div>
            <label htmlFor="cc-confirm-password" className="block text-xs font-admin font-semibold text-admin-600 uppercase tracking-wide mb-1.5">
              Your password
            </label>
            <input
              id="cc-confirm-password"
              ref={inputRef}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-admin-200 rounded-xl px-3.5 py-2.5 text-sm font-admin focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          {error && <p role="alert" className="text-sm font-admin text-red-600">{error}</p>}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button type="submit" disabled={!password || busy}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl text-sm font-admin font-semibold disabled:opacity-50 transition-colors
              ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-shell-800 hover:bg-shell-700'}`}>
            {busy && <Spinner size="sm" />} {confirmLabel}
          </button>
          <button type="button" onClick={onClose} disabled={busy}
            className="flex-1 py-2.5 border border-admin-200 text-admin-600 rounded-xl text-sm font-admin font-medium hover:bg-admin-50 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── FORMAT ────────────────────────────────────────────────────────────────────
export const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i += 1 }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

export const formatUptime = (seconds = 0) => {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d) return `${d}d ${h}h`
  if (h) return `${h}h ${m}m`
  return `${m}m`
}

// Is this timestamp older than `ms`? Kept out of the components so they stay pure to render.
export const isOlderThan = (date, ms) => Boolean(date) && Date.now() - new Date(date).getTime() > ms

// Plain-English version of an activity-log action: ADMIN_ROLE_CHANGED -> "admin role changed".
export const actionLabel = (action = '') => action.toLowerCase().replace(/_/g, ' ')
