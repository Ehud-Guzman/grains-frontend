import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea,
} from 'recharts'
import { Link } from 'react-router-dom'
import { Clock, TrendingDown, Scale } from 'lucide-react'
import { formatKES } from '../../utils/helpers'

// Lazy-loaded from ProductPage so the recharts vendor chunk (~380KB) is only
// downloaded when a product actually has price history to draw — not on every
// product view.

const RANGES = [
  { key: '1m',  label: '1M',  days: 30  },
  { key: '3m',  label: '3M',  days: 90  },
  { key: '6m',  label: '6M',  days: 180 },
  { key: '1y',  label: '1Y',  days: 365 },
  { key: 'all', label: 'All', days: null },
]

const SEASON_STYLE = {
  harvesting:  { fill: 'rgba(34,197,94,0.07)',   label: 'Harvest'     },
  drought:     { fill: 'rgba(251,146,60,0.09)',  label: 'Drought'     },
  planting:    { fill: 'rgba(59,130,246,0.07)',  label: 'Planting'    },
  import_hike: { fill: 'rgba(239,68,68,0.08)',   label: 'Import Hike' },
}

export default function PriceHistoryChart({ priceHistory, priceRange, onRangeChange, bestTime, productId }) {
  const cutoffDays = RANGES.find(r => r.key === priceRange)?.days
  const filtered = cutoffDays
    ? priceHistory.filter(l => new Date(l.changedAt) >= new Date(Date.now() - cutoffDays * 864e5))
    : priceHistory

  const chartData = filtered.map(l => ({
    date:      new Date(l.changedAt).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', timeZone: 'Africa/Nairobi' }),
    price:     l.newPrice,
    seasonTag: l.seasonTag,
  }))

  // Build season bands from consecutive same-tagged entries
  const seasonBands = []
  let band = null
  chartData.forEach((d, i) => {
    const tag = d.seasonTag
    if (!tag || tag === 'normal') { if (band) { seasonBands.push(band); band = null } return }
    if (band && band.tag === tag) { band.x2 = d.date }
    else { if (band) seasonBands.push(band); band = { tag, x1: d.date, x2: d.date } }
    if (i === chartData.length - 1 && band) seasonBands.push(band)
  })

  // Custom colored dots
  const ColoredDot = (props) => {
    const { cx, cy, index } = props
    if (!chartData[index]) return null
    const prev = chartData[index - 1]
    const curr = chartData[index]
    const color = !prev ? '#9E8E7A'
      : curr.price > prev.price ? '#EF4444'
      : curr.price < prev.price ? '#22C55E'
      : '#9E8E7A'
    return <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="#fff" strokeWidth={1} />
  }

  return (
    <div className="border-t border-earth-100 bg-white py-8 mt-4">
      <div className="container-page">

        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <Clock size={16} className="text-earth-500" />
            <h2 className="font-display text-lg font-bold text-earth-900">Price History</h2>
            {bestTime?.isBestTime && (
              <span className="inline-flex items-center gap-1 text-xs font-body font-semibold
                px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700">
                <TrendingDown size={11} /> {bestTime.percentBelow}% below 90d avg
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {productId && (
              <Link to={`/compare-prices?product=${productId}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body font-semibold
                  text-earth-600 border border-earth-200 hover:border-brand-300 hover:text-brand-700 transition-colors">
                <Scale size={12} /> Compare
              </Link>
            )}

            {/* Range selector */}
            <div className="flex items-center gap-1 bg-earth-50 rounded-xl p-1 border border-earth-100">
              {RANGES.map(r => (
                <button key={r.key} onClick={() => onRangeChange(r.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-body font-semibold transition-all ${
                    priceRange === r.key
                      ? 'bg-white text-earth-900 shadow-sm border border-earth-100'
                      : 'text-earth-500 hover:text-earth-700'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-3">
          <span className="flex items-center gap-1.5 text-xs font-body text-earth-400">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Price fell
          </span>
          <span className="flex items-center gap-1.5 text-xs font-body text-earth-400">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Price rose
          </span>
          {seasonBands.length > 0 && Object.entries(SEASON_STYLE)
            .filter(([tag]) => seasonBands.some(b => b.tag === tag))
            .map(([tag, { label, fill }]) => (
              <span key={tag} className="flex items-center gap-1.5 text-xs font-body text-earth-400">
                <span className="w-3 h-2.5 rounded-sm border border-earth-200" style={{ background: fill }} />
                {label}
              </span>
            ))
          }
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1EDE6" vertical={false} />

            {/* Season bands */}
            {seasonBands.map((b, i) => {
              const style = SEASON_STYLE[b.tag]
              if (!style) return null
              return (
                <ReferenceArea key={i} x1={b.x1} x2={b.x2}
                  fill={style.fill} stroke="none" />
              )
            })}

            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9E8E7A', fontFamily: 'Outfit' }}
              axisLine={false} tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9E8E7A', fontFamily: 'Outfit' }}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
              axisLine={false} tickLine={false} width={36}
              domain={['auto', 'auto']}
            />
            <Tooltip
              formatter={(v) => [formatKES(v), 'Price']}
              contentStyle={{
                fontFamily: 'Outfit', fontSize: 12,
                borderRadius: 10, border: '1px solid #E8DDD0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#C8912A"
              strokeWidth={2}
              dot={<ColoredDot />}
              activeDot={{ r: 5, fill: '#C8912A', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {bestTime && (
          <p className="mt-3 text-xs font-body text-earth-400 text-right">
            90-day avg · {formatKES(bestTime.avg90d)}
          </p>
        )}
      </div>
    </div>
  )
}
