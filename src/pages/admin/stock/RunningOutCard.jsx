import { useEffect, useState } from 'react'
import { TrendingDown } from 'lucide-react'
import { adminStockService } from '../../../services/admin/stock.service'

const TONE = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  soon: 'bg-amber-50 text-amber-700 border-amber-200',
  watch: 'bg-yellow-50 text-yellow-700 border-yellow-200',
}

export const daysLabel = (days) =>
  days <= 0 ? 'out now' : days === 1 ? '~1 day left' : `~${days} days left`

// Items that will run out soonest at their current sales pace. Sits above the stock table so the
// reorder decision is visible before anyone scrolls.
export default function RunningOutCard() {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    let live = true
    adminStockService.getForecast()
      .then(res => { if (live) setRows(res.data?.data || []) })
      .catch(() => { if (live) setRows([])})
    return () => { live = false }
  }, [])

  const soon = (rows || []).filter(r => r.severity !== 'ok').slice(0, 6)
  if (!soon.length) return null

  return (
    <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-4 mb-4" data-testid="running-out">
      <div className="flex items-center gap-2 mb-3">
        <TrendingDown size={15} className="text-amber-600" aria-hidden="true" />
        <h2 className="font-admin font-bold text-admin-900 text-sm">Running out soon</h2>
        <span className="text-xs font-admin text-admin-500">at the pace of the last {soon[0].windowDays} days</span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {soon.map(r => (
          <li key={`${r.productId}-${r.varietyName}-${r.packagingSize}`}
            className={`rounded-lg border px-3 py-2 text-sm font-admin ${TONE[r.severity]}`}>
            <p className="font-semibold truncate">{r.productName} · {r.varietyName} {r.packagingSize}</p>
            <p className="text-xs mt-0.5">
              {daysLabel(r.daysLeft)} · {r.stock} in stock · selling {r.perDay}/day
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
