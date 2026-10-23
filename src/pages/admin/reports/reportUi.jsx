import { ArrowUp, ArrowDown } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useAdminTheme } from '../../../components/admin/adminTheme'
import { money, moneyCompact, hourLabel, humanise, percentChange } from './reportFormat'

// Pieces shared by the report tabs: tiles, callouts, the change badge, charts, and the print sheet.

// ── CHART COLOURS ─────────────────────────────────────────────────────────────
// Recharts draws SVG from literal colours (CSS variables and Tailwind classes cannot reach it), so the charts
// keep a light and a dark palette and pick by the admin theme. `main` is the series colour (the same green as
// the dashboard); `accent` is the second series and the highlight.
export const STATUS_COLORS = {
  pending:          '#F59E0B',
  approved:         '#22C55E',
  preparing:        '#3B82F6',
  out_for_delivery: '#8B5CF6',
  completed:        '#14B8A6',
  rejected:         '#EF4444',
  cancelled:        '#9CA3AF',
}

const INK = {
  light: { grid: '#E5E7EB', tick: '#6B7280', main: '#2E6649', accent: '#E08A4A', soft: '#D9E6DE' },
  dark:  { grid: '#26382F', tick: '#94A69A', main: '#5EC38B', accent: '#E08A4A', soft: '#244535' },
}
export const useChartInk = () => INK[useAdminTheme().resolved]

const tickStyle = (ink, size = 11) => ({ fontSize: size, fill: ink.tick, fontFamily: 'Outfit' })

// ── TILES AND NOTES ───────────────────────────────────────────────────────────
const TONES = { good: 'text-shell-700', warn: 'text-amber-700', bad: 'text-red-600' }

export const KpiTile = ({ label, value, sub, delta, tone }) => (
  <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5 min-w-0">
    <p className="text-admin-500 text-xs font-admin uppercase tracking-wide mb-1.5">{label}</p>
    <p className={`text-xl sm:text-2xl font-admin font-bold leading-tight tabular-nums break-words ${TONES[tone] || 'text-admin-900'}`}>
      {value ?? '—'}
    </p>
    {sub && <p className="text-xs font-admin text-admin-500 mt-1">{sub}</p>}
    {delta}
  </div>
)

// "▲ 12% vs previous 30 days". Silent when there is nothing sensible to compare with.
export const ChangeBadge = ({ now, before, caption }) => {
  const pct = percentChange(now, before)
  if (pct === null) return null
  if (pct === 0) return <p className="text-xs font-admin font-medium text-admin-500 mt-1.5">Same as {caption}</p>
  const up = pct > 0
  const Arrow = up ? ArrowUp : ArrowDown
  return (
    <p className={`flex items-center gap-1 text-xs font-admin font-semibold mt-1.5 ${up ? 'text-shell-700' : 'text-red-600'}`}>
      <Arrow size={12} aria-hidden="true" />
      <span>{Math.abs(pct)}%</span>
      <span className="sr-only">{up ? 'up' : 'down'} {Math.abs(pct)}% compared with {caption}</span>
      <span aria-hidden="true" className="text-admin-500 font-medium">vs {caption}</span>
    </p>
  )
}

const CALLOUT = {
  info: 'bg-sky-50 border-sky-200 text-sky-900',
  warn: 'bg-amber-50 border-amber-200 text-amber-800',
}
export const Callout = ({ tone = 'info', children }) => (
  <div className={`border rounded-xl p-4 text-sm font-admin ${CALLOUT[tone]}`}>{children}</div>
)

export const Card = ({ title, subtitle, children, className = '' }) => (
  <section className={`bg-white rounded-xl border border-admin-200 shadow-admin p-5 ${className}`}>
    {title && <h3 className="font-admin font-bold text-admin-900">{title}</h3>}
    {subtitle && <p className="text-xs font-admin text-admin-500 mt-0.5">{subtitle}</p>}
    <div className={title ? 'mt-4' : ''}>{children}</div>
  </section>
)

// ── CHARTS ────────────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, valueFormatter }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-admin-200 rounded-xl shadow-admin p-3 text-sm font-admin">
      <p className="text-admin-500 text-xs mb-2 capitalize">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold text-admin-800" style={p.color ? { color: p.color } : undefined}>
          {p.name}: {valueFormatter ? valueFormatter(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export const SalesLineChart = ({ data }) => {
  const ink = useChartInk()
  if (!data?.length) return null
  const formatted = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', timeZone: 'Africa/Nairobi' }),
    revenue: Math.round(d.revenue),
    orders: d.orders,
  }))
  return (
    <Card title="Revenue Over Time">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={formatted} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ink.grid} vertical={false} />
          <XAxis dataKey="date" tick={tickStyle(ink)} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis tick={tickStyle(ink)} axisLine={false} tickLine={false} tickFormatter={moneyCompact} width={44} />
          <Tooltip content={<ChartTooltip valueFormatter={money} />} />
          <Line type="monotone" dataKey="revenue" name="Revenue" stroke={ink.main} strokeWidth={2.5}
            dot={formatted.length > 20 ? false : { r: 3, fill: ink.main, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: ink.main }} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}

export const TopProductsChart = ({ data }) => {
  const ink = useChartInk()
  if (!data?.length) return null
  const top5 = data.slice(0, 5).map(p => ({
    name: p.productName.length > 22 ? `${p.productName.slice(0, 22)}…` : p.productName,
    units: p.unitsSold,
  }))
  return (
    <Card title="Top 5 Products by Units Sold">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={top5} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ink.grid} horizontal={false} />
          <XAxis type="number" tick={tickStyle(ink)} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={148} tick={tickStyle(ink, 10)} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="units" name="Units Sold" fill={ink.main} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

export const OrdersBarChart = ({ data }) => {
  const ink = useChartInk()
  if (!data?.length) return null
  const formatted = data.map(d => ({ status: humanise(d._id), count: d.count, fill: STATUS_COLORS[d._id] || ink.main }))
  return (
    <Card title="Orders by Status">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={formatted} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ink.grid} vertical={false} />
          <XAxis dataKey="status" tick={tickStyle(ink)} axisLine={false} tickLine={false} />
          <YAxis tick={tickStyle(ink)} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" name="Orders" radius={[6, 6, 0, 0]}>
            {formatted.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// Orders by hour of the day (Nairobi clock). The three busiest hours are highlighted.
export const HoursChart = ({ data }) => {
  const ink = useChartInk()
  if (!data?.length || !data.some(h => h.orders > 0)) return null
  const top = new Set([...data].filter(h => h.orders > 0).sort((a, b) => b.orders - a.orders).slice(0, 3).map(h => h.hour))
  const formatted = data.map(h => ({ hour: hourLabel(h.hour), orders: h.orders, busy: top.has(h.hour) }))
  const busiest = data.reduce((a, b) => (b.orders > a.orders ? b : a))
  return (
    <Card title="When Orders Come In" subtitle={`Busiest hour: ${hourLabel(busiest.hour)} (${busiest.orders} orders). Times are Nairobi time.`}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={formatted} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ink.grid} vertical={false} />
          <XAxis dataKey="hour" tick={tickStyle(ink, 10)} axisLine={false} tickLine={false} interval={2} />
          <YAxis tick={tickStyle(ink)} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="orders" name="Orders" radius={[4, 4, 0, 0]}>
            {formatted.map((h, i) => <Cell key={i} fill={h.busy ? ink.accent : ink.soft} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── PRINT SHEET ───────────────────────────────────────────────────────────────
export const PRINT_STYLES = `
  @media screen { .print-only { display: none !important; } }
  @media print  { .print-only { display: block !important; } }
`

export const PrintHeader = ({ shopInfo, tabLabel, periodText }) => {
  const today = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' })
  return (
    <div className="print-only mb-8 pb-6 border-b-2 border-admin-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img src="/Vittorios-logo.jpeg" alt="Vittorios" style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover' }} />
          <div>
            <h1 className="text-xl font-bold text-admin-900" style={{ fontFamily: 'Georgia, serif' }}>{shopInfo.name}</h1>
            <p className="text-admin-500 text-xs mt-0.5">{shopInfo.tagline}</p>
            <div className="flex items-center gap-4 mt-1 text-xs text-admin-500">
              <span>📞 {shopInfo.phone}</span>
              <span>✉ {shopInfo.email}</span>
            </div>
          </div>
        </div>
        <div className="text-right text-sm text-admin-500 space-y-0.5">
          <p className="font-semibold text-admin-800 text-base">{tabLabel} Report</p>
          <p>{periodText}</p>
          <p>Generated: {today}</p>
        </div>
      </div>
    </div>
  )
}

export const PrintFooter = ({ shopInfo }) => (
  <div className="print-only mt-10 pt-5 border-t border-admin-200">
    <div className="flex items-center justify-between text-xs text-admin-500">
      <div className="flex items-center gap-5">
        <span>📞 {shopInfo.phone}</span>
        <span>✉ {shopInfo.email}</span>
        <span>🕐 {shopInfo.hours}</span>
      </div>
      <span>📍 {shopInfo.location}</span>
    </div>
  </div>
)
