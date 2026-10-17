import { useEffect, useId, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

// Quantity control with a typeable number box.
//
// Quantity used to be ±1 taps only — fine for retail, unusable for a wholesale buyer
// ordering 50 or 200 units. The box accepts typing (draft kept as text so it can be
// cleared mid-edit), commits on blur/Enter, and always lands on a whole number between
// `min` and `max`. Optional quick-add chips (+10, +50) cover the common bulk jumps.
// Touch targets are 44px (the app-wide floor) unless `compact`.
export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = null,
  label = 'Quantity',
  quickAdds = [],
  compact = false,
  disabled = false,
  className = '',
}) {
  const inputId = useId()
  const [draft, setDraft] = useState(String(value))

  // Follow changes that did not come from typing (the +/- buttons, a cart refresh).
  useEffect(() => { setDraft(String(value)) }, [value])

  const hasMax = typeof max === 'number' && Number.isFinite(max)
  const clamp = (n) => Math.max(min, hasMax ? Math.min(max, n) : n)

  const commit = (raw) => {
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed)) { setDraft(String(value)); return }
    const next = clamp(parsed)
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  const step = (delta) => {
    const next = clamp(value + delta)
    if (next !== value) onChange(next)
  }

  const size = compact ? 'w-10 h-10' : 'w-11 h-11'
  const btn = `${size} rounded-lg bg-white border border-earth-200 flex items-center justify-center
    hover:bg-earth-100 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed
    disabled:hover:bg-white`

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1 bg-earth-50 rounded-xl border border-earth-200 p-1">
        <button type="button" onClick={() => step(-1)} disabled={disabled || value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`} className={btn}>
          <Minus size={14} className="text-earth-600" aria-hidden="true" />
        </button>

        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          aria-label={label}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, '').slice(0, 5))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(e.currentTarget.value) } }}
          onFocus={(e) => e.target.select()}
          className={`${compact ? 'w-12' : 'w-14'} text-center font-body font-bold text-earth-900 bg-transparent
            border-0 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded-md ${compact ? 'h-10' : 'h-11'}`}
        />

        <button type="button" onClick={() => step(1)} disabled={disabled || (hasMax && value >= max)}
          aria-label={`Increase ${label.toLowerCase()}`} className={btn}>
          <Plus size={14} className="text-earth-600" aria-hidden="true" />
        </button>
      </div>

      {quickAdds.map((n) => (
        <button key={n} type="button" onClick={() => step(n)} disabled={disabled || (hasMax && value >= max)}
          aria-label={`Add ${n}`}
          className="min-h-[44px] px-3 rounded-lg border border-earth-200 bg-white text-sm font-body font-semibold
            text-earth-700 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50 transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed">
          +{n}
        </button>
      ))}
    </div>
  )
}
