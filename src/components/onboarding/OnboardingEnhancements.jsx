import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, Sparkles, X, ArrowRight, ArrowLeft } from 'lucide-react'

const ACCENT_STYLES = {
  brand: {
    shell: 'border-brand-200/70 bg-brand-50/70',
    badge: 'border-brand-300/30 bg-brand-500/10 text-brand-700',
    icon: 'bg-brand-500 text-white',
    title: 'text-earth-900',
    body: 'text-earth-600',
    stat: 'text-earth-900',
    subtext: 'text-earth-500',
    track: 'bg-white/70 border-white/60',
    pendingRow: 'border-white/70 bg-white/65',
    completedRow: 'border-green-200 bg-white/85',
    pendingTitle: 'text-earth-800',
    completedTitle: 'text-earth-900',
    helper: 'text-earth-500',
    button: 'text-brand-700 hover:text-brand-800',
    actionButton: 'bg-earth-900 hover:bg-earth-800 text-white',
    glowPrimary: 'bg-white/40',
    glowSecondary: 'bg-brand-500/10',
  },
  admin: {
    shell: 'border-admin-200 bg-white',
    badge: 'border-admin-300/40 bg-admin-900 text-white',
    icon: 'bg-admin-900 text-white',
    title: 'text-admin-900',
    body: 'text-admin-600',
    stat: 'text-admin-900',
    subtext: 'text-admin-500',
    track: 'bg-admin-50 border-admin-100',
    pendingRow: 'border-admin-100 bg-admin-50/70',
    completedRow: 'border-green-200 bg-green-50',
    pendingTitle: 'text-admin-900',
    completedTitle: 'text-admin-900',
    helper: 'text-admin-500',
    button: 'text-brand-700 hover:text-brand-800',
    actionButton: 'bg-admin-900 hover:bg-admin-800 text-white',
    glowPrimary: 'bg-white/40',
    glowSecondary: 'bg-brand-500/10',
  },
}

export function OnboardingChecklistCard({
  eyebrow,
  title,
  description,
  items,
  actionLabel,
  onAction,
  theme = 'brand',
}) {
  const location = useLocation()
  const doneCount = items.filter(item => item.done).length
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0
  const styles = ACCENT_STYLES[theme] || ACCENT_STYLES.brand

  return (
    <div className={`relative overflow-hidden rounded-[1.75rem] border shadow-sm ${styles.shell}`}>
      <div className="absolute inset-0 pointer-events-none opacity-70">
        <div className={`absolute -top-12 -right-10 h-40 w-40 rounded-full blur-3xl ${styles.glowPrimary}`} />
        <div className={`absolute -bottom-16 -left-8 h-44 w-44 rounded-full blur-3xl ${styles.glowSecondary}`} />
      </div>

      <div className="relative p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${styles.badge}`}>
              <Sparkles size={12} />
              {eyebrow}
            </div>
            <h3 className={`font-display text-2xl font-bold mt-4 mb-2 ${styles.title}`}>
              {title}
            </h3>
            <p className={`text-sm font-body leading-relaxed max-w-2xl ${styles.body}`}>
              {description}
            </p>
          </div>

          <div className="min-w-[88px] text-right">
            <p className={`font-display text-3xl font-bold ${styles.stat}`}>{progress}%</p>
            <p className={`text-xs font-body mt-1 ${styles.subtext}`}>
              {doneCount} of {items.length} complete
            </p>
          </div>
        </div>

        <div className={`h-2 rounded-full overflow-hidden mb-5 ${styles.track}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 via-brand-400 to-amber-300 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="space-y-3">
          {items.map(item => (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                item.done
                  ? styles.completedRow
                  : styles.pendingRow
              }`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.done ? 'bg-green-500 text-white' : styles.icon}`}>
                <CheckCircle2 size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-body font-semibold ${item.done ? styles.completedTitle : styles.pendingTitle}`}>
                  {item.label}
                </p>
                <p className={`text-xs font-body mt-0.5 ${styles.helper}`}>
                  {item.helper}
                </p>
              </div>
              {item.href && !item.done && (
                <Link
                  to={item.href}
                  state={theme === 'admin' ? {
                    onboardingReturnTo: `${location.pathname}${location.search}`,
                    onboardingReturnLabel: 'Operational Readiness',
                  } : undefined}
                  className={`inline-flex items-center gap-1 text-xs font-body font-semibold transition-colors ${styles.button}`}
                >
                  {item.cta || 'Open'}
                  <ArrowRight size={13} />
                </Link>
              )}
            </div>
          ))}
        </div>

        {onAction && (
          <div className="mt-5 flex justify-end">
            <button
              onClick={onAction}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-body font-semibold transition-all active:scale-[0.98] ${styles.actionButton}`}
            >
              <Sparkles size={15} />
              {actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function OnboardingReturnLink({
  fallbackTo = '/admin/dashboard',
  fallbackLabel = 'Operational Readiness',
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const returnTo = location.state?.onboardingReturnTo
  const returnLabel = location.state?.onboardingReturnLabel || fallbackLabel

  if (!returnTo) return null

  return (
    <button
      onClick={() => navigate(returnTo)}
      className="inline-flex items-center gap-1.5 rounded-full border border-admin-200 bg-white px-3 py-1.5 text-xs font-admin font-semibold text-admin-600 transition-colors hover:bg-admin-50 hover:text-admin-900"
    >
      <ArrowLeft size={13} />
      Back to {returnLabel}
    </button>
  )
}

export function ContextualTip({
  title,
  body,
  tipId,
  onDismiss,
  action,
  theme = 'brand',
}) {
  const styles = ACCENT_STYLES[theme] || ACCENT_STYLES.brand

  return (
    <div className={`relative overflow-hidden rounded-[1.5rem] border p-4 sm:p-5 shadow-sm ${styles.shell}`}>
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute -top-10 right-0 h-28 w-28 rounded-full bg-white/40 blur-3xl" />
      </div>

      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${styles.badge}`}>
            <Sparkles size={12} />
            Helpful Tip
          </div>
          {tipId && onDismiss && (
            <button
              onClick={() => onDismiss(tipId)}
              className="rounded-full p-1.5 text-earth-400 transition-colors hover:bg-white/70 hover:text-earth-700"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <h4 className="font-display text-xl font-bold text-earth-900 mb-2">
          {title}
        </h4>
        <p className="text-sm font-body leading-relaxed text-earth-600">
          {body}
        </p>

        {action && (
          <div className="mt-4">
            {action}
          </div>
        )}
      </div>
    </div>
  )
}
