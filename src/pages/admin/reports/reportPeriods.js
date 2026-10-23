// The period choices on the Reports page, and how each becomes API parameters.
//
// Two kinds. Rolling windows ("7 Days", "30 Days", "12 Months") end now and look back, so they cut
// calendar months in half: fine for "how are we doing lately", wrong for a month-end or a VAT return.
// Calendar periods (This month, Last month, a custom range) are sent as explicit from/to dates, which the API
// already accepts on every report and snaps to Nairobi day boundaries.

export const PERIODS = [
  { value: 'today',      label: 'Today' },
  { value: 'week',       label: '7 Days' },
  { value: 'month',      label: '30 Days' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'year',       label: '12 Months' },
  { value: 'custom',     label: 'Custom' },
]

export const isRolling = (period) => ['today', 'week', 'month', 'year'].includes(period)

const pad = (n) => String(n).padStart(2, '0')

// Today's date on the Nairobi clock, as YYYY-MM-DD, whatever the viewer's device timezone.
export const eatToday = (now = new Date()) => now.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })

// First and last day (YYYY-MM-DD) of the calendar month `offset` months from the one containing `today`.
// The last day of "this month" is capped at today: nothing has happened after it.
export const monthRange = (today, offset = 0) => {
  const [y, m] = today.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1 + offset, 1))
  const last = new Date(Date.UTC(y, m + offset, 0))
  const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  const end = ymd(last)
  return { from: ymd(first), to: offset === 0 && end > today ? today : end }
}

// The query parameters for a period. `custom` is { from, to }. null means "not ready to ask yet"
// (a custom range with a missing or backwards date).
export const periodParams = (period, custom = {}, today = eatToday()) => {
  if (isRolling(period)) return { period }
  if (period === 'this-month') return monthRange(today, 0)
  if (period === 'last-month') return monthRange(today, -1)
  if (period === 'custom') {
    if (!custom.from || !custom.to || custom.from > custom.to) return null
    return { from: custom.from, to: custom.to }
  }
  return { period: 'month' }
}

const fmtDay = (ymd) => new Date(`${ymd}T12:00:00+03:00`).toLocaleDateString('en-KE', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi',
})

// A readable name for the chosen period, for the print header and the "vs previous" captions.
export const periodLabel = (period, custom = {}, today = eatToday()) => {
  const p = PERIODS.find(x => x.value === period)
  if (period === 'this-month' || period === 'last-month') {
    const { from, to } = periodParams(period, custom, today)
    return `${p.label} (${fmtDay(from)} – ${fmtDay(to)})`
  }
  if (period === 'custom') {
    return custom.from && custom.to ? `${fmtDay(custom.from)} – ${fmtDay(custom.to)}` : 'Custom range'
  }
  return p?.label ?? ''
}

// Number of days a returned { start, end } period spans, for "vs previous 30 days".
export const spanDays = (period) => {
  if (!period?.start || !period?.end) return null
  return Math.max(1, Math.round((new Date(period.end) - new Date(period.start)) / 86400000))
}
