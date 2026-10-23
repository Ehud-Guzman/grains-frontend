import DataTable from './ReportTable'
import { KpiTile, Callout } from './reportUi'
import { money, humanise } from './reportFormat'
import { formatDate } from '../../../utils/helpers'

const td = 'px-3 sm:px-5 py-3.5'

const ProductCell = ({ name, sub }) => (
  <td className={td}>
    <p className="font-admin font-semibold text-admin-800">{name}</p>
    {sub && <p className="text-admin-500 text-xs font-admin">{sub}</p>}
  </td>
)

// ── STOCK VALUATION ───────────────────────────────────────────────────────────
export function StockTab({ data }) {
  const rows = data.rows || []
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <KpiTile label="Stock Value (Cost Price)" value={money(data.totalStockValueKES)} sub="what the stock on the shelves cost you" />
        <KpiTile label="Line Items" value={data.itemCount} sub="every product size with a price" />
      </div>
      {data.rowsMissingCostPrice > 0 && (
        <Callout tone="warn">
          {data.rowsMissingCostPrice} line{data.rowsMissingCostPrice === 1 ? '' : 's'} have no cost price set
          and fall back to selling price — those figures overstate true cost value. Set a cost price on
          each packaging size for an accurate total.
        </Callout>
      )}
      <DataTable
        title="Stock Valuation"
        subtitle={`All ${rows.length} lines, most valuable first`}
        headers={[
          { label: 'Product', sort: r => `${r.productName} ${r.varietyName} ${r.packagingSize}` },
          { label: 'Stock', right: true, sort: r => r.stock },
          { label: 'Unit Value', right: true, sort: r => r.unitValueKES },
          { label: 'Value', right: true, sort: r => r.totalValueKES },
        ]}
        defaultSort={{ label: 'Value', dir: 'desc' }}
        rows={rows}
        searchText={r => `${r.productName} ${r.varietyName} ${r.packagingSize} ${r.category || ''}`}
        chips={[
          { key: 'out', label: 'Out of stock', test: r => r.stock === 0 },
          ...(data.rowsMissingCostPrice > 0 ? [{ key: 'nocost', label: 'No cost price', test: r => r.usedRetailFallback }] : []),
        ]}
        renderRow={(r, i) => (
          <tr key={i} className="hover:bg-admin-50 transition-colors">
            <ProductCell name={r.productName} sub={`${r.varietyName} · ${r.packagingSize}`} />
            <td className={`${td} text-right whitespace-nowrap font-admin ${r.stock === 0 ? 'text-red-600 font-semibold' : 'text-admin-700'}`}>{r.stock}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin text-admin-500`}>
              {money(r.unitValueKES)}
              {r.usedRetailFallback && <span className="ml-1 text-amber-600" title="No cost price set — using selling price">*</span>}
            </td>
            <td className={`${td} text-right whitespace-nowrap font-admin font-bold text-admin-800`}>{money(r.totalValueKES)}</td>
          </tr>
        )}
      />
    </>
  )
}

// ── STOCK TURNOVER ────────────────────────────────────────────────────────────
export function TurnoverTab({ data }) {
  const rows = data.rows || []
  return (
    <>
      <Callout>
        Turnover ratio = units sold ÷ current stock over the selected period. Higher is better
        (stock is moving); a low ratio with high stock signals excess or slow-moving inventory.
        Days of supply is how long today&apos;s stock lasts at the period&apos;s selling pace. The shortest come first.
      </Callout>
      <DataTable
        title="Stock Turnover by SKU"
        subtitle={`${rows.length} lines`}
        headers={[
          { label: 'Product', sort: r => `${r.productName} ${r.varietyName} ${r.packagingSize}` },
          { label: 'Units Sold', right: true, sort: r => r.unitsSold },
          { label: 'Current Stock', right: true, sort: r => r.currentStock },
          { label: 'Turnover Ratio', right: true, sort: r => r.turnoverRatio },
          { label: 'Days of Supply', right: true, sort: r => r.daysOfSupply },
        ]}
        defaultSort={{ label: 'Days of Supply', dir: 'asc' }}
        rows={rows}
        searchText={r => `${r.productName} ${r.varietyName} ${r.packagingSize} ${r.category || ''}`}
        chips={[
          { key: 'urgent', label: 'Runs out within 7 days', test: r => r.daysOfSupply != null && r.daysOfSupply <= 7 },
          { key: 'slow', label: 'Slow (ratio under 0.3)', test: r => r.turnoverRatio != null && r.turnoverRatio < 0.3 },
        ]}
        renderRow={(r, i) => (
          <tr key={i} className="hover:bg-admin-50 transition-colors">
            <ProductCell name={r.productName} sub={`${r.varietyName} · ${r.packagingSize}`} />
            <td className={`${td} text-right whitespace-nowrap font-admin text-admin-700`}>{r.unitsSold}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin text-admin-700`}>{r.currentStock}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin font-bold ${
              r.turnoverRatio == null ? 'text-admin-500' : r.turnoverRatio >= 1 ? 'text-green-700'
                : r.turnoverRatio >= 0.3 ? 'text-amber-600' : 'text-red-600'}`}>
              {r.turnoverRatio != null ? r.turnoverRatio : '—'}
            </td>
            <td className={`${td} text-right whitespace-nowrap font-admin ${r.daysOfSupply != null && r.daysOfSupply <= 7 ? 'text-red-600 font-semibold' : 'text-admin-600'}`}>
              {r.daysOfSupply != null ? `${r.daysOfSupply}d` : '—'}
            </td>
          </tr>
        )}
      />
    </>
  )
}

// ── SLOW MOVERS ───────────────────────────────────────────────────────────────
const WINDOWS = [30, 60, 90, 180]

export function SlowMoversTab({ data, days, onDays }) {
  const rows = data.slowMovers || []
  return (
    <>
      <div className="flex flex-wrap items-center gap-2" data-no-print>
        <span className="text-xs font-admin font-semibold text-admin-500 mr-1">No sale in the last</span>
        {WINDOWS.map(d => (
          <button key={d} type="button" onClick={() => onDays(d)} aria-pressed={days === d}
            className={`px-3.5 py-1.5 rounded-full text-xs font-admin font-semibold border transition-colors ${
              days === d ? 'bg-shell-800 text-white border-shell-800' : 'bg-white border-admin-200 text-admin-600 hover:border-admin-400'}`}>
            {d} days
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <KpiTile label="Products Not Selling" value={data.count} sub={`no approved order in ${data.days} days`} tone={data.count > 0 ? 'warn' : 'good'} />
        <KpiTile label="Money Tied Up in Them" value={money(data.totalValueTiedUpKES)} sub="their stock at cost price" tone={data.totalValueTiedUpKES > 0 ? 'warn' : undefined} />
      </div>

      <DataTable
        title="Slow-Moving Products"
        subtitle="Most money tied up first"
        headers={[
          { label: 'Product', sort: r => r.name },
          { label: 'Stock on hand', right: true, sort: r => r.stockUnits },
          { label: 'Value at cost', right: true, sort: r => r.stockValueKES },
          { label: 'Last sold', right: true, sort: r => (r.lastSoldAt ? new Date(r.lastSoldAt).getTime() : null) },
        ]}
        defaultSort={{ label: 'Value at cost', dir: 'desc' }}
        rows={rows}
        searchText={r => `${r.name} ${r.category || ''}`}
        chips={[
          { key: 'stocked', label: 'Holding stock', test: r => r.stockUnits > 0 },
          { key: 'never', label: 'Never sold', test: r => r.neverSold },
        ]}
        emptyMessage="No slow-moving products — everything has sold recently"
        renderRow={(r, i) => (
          <tr key={r.productId || i} className="hover:bg-admin-50 transition-colors">
            <ProductCell name={r.name} sub={`${r.category || 'Uncategorised'} · ${r.varietyCount} variet${r.varietyCount === 1 ? 'y' : 'ies'}`} />
            <td className={`${td} text-right whitespace-nowrap font-admin ${r.stockUnits === 0 ? 'text-admin-500' : 'text-admin-700'}`}>{r.stockUnits}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin font-bold ${r.stockValueKES > 0 ? 'text-amber-700' : 'text-admin-500'}`}>
              {money(r.stockValueKES)}
              {r.usedRetailFallback && <span className="ml-1 text-amber-600" title="No cost price set — using selling price">*</span>}
            </td>
            <td className={`${td} text-right whitespace-nowrap font-admin text-admin-600`}>
              {r.neverSold ? <span className="font-semibold text-red-600">Never</span> : (
                <>
                  <span className="block">{formatDate(r.lastSoldAt)}</span>
                  <span className="block text-xs text-admin-500">{r.daysWithoutSale} days ago</span>
                </>
              )}
            </td>
          </tr>
        )}
      />
    </>
  )
}

// ── STOCK MOVEMENT ────────────────────────────────────────────────────────────
export function MovementTab({ data }) {
  const logs = data.logs || []
  const types = [...new Set(logs.map(l => l.changeType).filter(Boolean))]
  return (
    <>
      {data.truncated && (
        <Callout tone="warn">
          Showing the most recent {data.count.toLocaleString()} movements — narrow the period to see all activity in this range.
        </Callout>
      )}
      {Object.keys(data.summary || {}).length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(data.summary).map(([type, qty]) => (
            <KpiTile key={type} label={humanise(type)} value={qty.toLocaleString('en-KE')} />
          ))}
        </div>
      )}
      <DataTable
        title="Stock Movement Log"
        headers={[
          { label: 'Date', sort: r => new Date(r.timestamp).getTime() },
          { label: 'Product', sort: r => r.productId?.name || '' },
          { label: 'Type' },
          { label: 'Qty Change', right: true, sort: r => r.quantityChange },
          { label: 'Balance After', right: true, sort: r => r.balanceAfter },
          { label: 'By' },
        ]}
        defaultSort={{ label: 'Date', dir: 'desc' }}
        rows={logs}
        searchText={r => `${r.productId?.name || ''} ${r.reason || ''} ${r.performedBy?.name || ''}`}
        chips={types.length > 1 ? types.map(t => ({ key: t, label: humanise(t), test: r => r.changeType === t })) : undefined}
        emptyMessage="No stock movements in this period"
        renderRow={(r, i) => (
          <tr key={r._id || i} className="hover:bg-admin-50 transition-colors">
            <td className={`${td} font-admin text-admin-600 text-xs whitespace-nowrap`}>
              {new Date(r.timestamp).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
            </td>
            <td className={`${td} font-admin font-semibold text-admin-800`}>{r.productId?.name || '—'}</td>
            <td className={`${td} font-admin text-admin-600`}>{humanise(r.changeType)}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin font-bold ${r.quantityChange >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {r.quantityChange > 0 ? '+' : ''}{r.quantityChange}
            </td>
            <td className={`${td} text-right whitespace-nowrap font-admin text-admin-700`}>{r.balanceAfter}</td>
            <td className={`${td} font-admin text-admin-600 text-xs`}>{r.performedBy?.name || '—'}</td>
          </tr>
        )}
      />
    </>
  )
}
