import { Bike } from 'lucide-react'
import DataTable from './ReportTable'
import { KpiTile, Callout } from './reportUi'
import { money } from './reportFormat'

const td = 'px-3 sm:px-5 py-3.5'

// ── GROSS MARGINS ─────────────────────────────────────────────────────────────
export function MarginsTab({ data }) {
  const s = data.summary || {}
  const rows = data.rows || []
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Total Revenue (all SKUs)" value={money(s.totalRevenue)} />
        <KpiTile label="Estimated Cost (costed SKUs)" value={money(s.totalCost)} />
        <KpiTile label="Gross Profit (costed SKUs)" value={money(s.totalGrossProfit)} tone={s.totalGrossProfit < 0 ? 'bad' : undefined} />
        <KpiTile label="Overall Margin" value={s.overallMarginPct != null ? `${s.overallMarginPct}%` : '—'}
          tone={s.overallMarginPct == null ? undefined : s.overallMarginPct < 10 ? 'warn' : 'good'} />
      </div>

      {s.skusWithCostData < s.totalSkus && (
        <Callout tone="warn">
          Margin data is available for {s.skusWithCostData} of {s.totalSkus} SKUs.
          Add <strong>Cost Price</strong> to products to improve coverage.
        </Callout>
      )}
      <p className="text-xs font-admin text-admin-500 -mt-2">
        Cost is the cost price set on each product today, not what it cost when sold, so margins shift if you change a cost price.
      </p>

      <DataTable
        title="Gross Margin by SKU"
        subtitle={`${rows.length} products sold in this period`}
        headers={[
          { label: 'Product', sort: r => `${r.productName} ${r.variety} ${r.packaging}` },
          { label: 'Units', right: true, sort: r => r.unitsSold },
          { label: 'Revenue', right: true, sort: r => r.revenue },
          { label: 'Cost', right: true, sort: r => r.estimatedCost },
          { label: 'Profit', right: true, sort: r => r.grossProfit },
          { label: 'Margin %', right: true, sort: r => r.marginPct },
        ]}
        defaultSort={{ label: 'Profit', dir: 'desc' }}
        rows={rows}
        searchText={r => `${r.productName} ${r.variety} ${r.packaging}`}
        chips={[
          { key: 'low', label: 'Low margin (under 10%)', test: r => r.marginPct != null && r.marginPct >= 0 && r.marginPct < 10 },
          { key: 'loss', label: 'Selling at a loss', test: r => r.marginPct != null && r.marginPct < 0 },
          { key: 'nocost', label: 'No cost price', test: r => r.marginPct == null },
        ]}
        emptyMessage="No completed orders in this period"
        renderRow={(r, i) => (
          <tr key={i} className="hover:bg-admin-50 transition-colors">
            <td className={td}>
              <p className="font-admin font-semibold text-admin-800">{r.productName}</p>
              <p className="text-admin-500 text-xs font-admin">{r.variety} · {r.packaging}</p>
            </td>
            <td className={`${td} text-right whitespace-nowrap font-admin text-admin-600`}>{r.unitsSold}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin text-admin-800`}>{money(r.revenue)}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin text-admin-500`}>{r.estimatedCost != null ? money(r.estimatedCost) : '—'}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin font-bold ${r.grossProfit == null ? 'text-admin-500' : r.grossProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {r.grossProfit != null ? money(r.grossProfit) : '—'}
            </td>
            <td className={`${td} text-right whitespace-nowrap font-admin font-bold ${
              r.marginPct == null ? 'text-admin-500' : r.marginPct >= 20 ? 'text-green-700' : r.marginPct >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
              {r.marginPct != null ? `${r.marginPct}%` : '—'}
            </td>
          </tr>
        )}
      />
    </>
  )
}

// ── VAT ───────────────────────────────────────────────────────────────────────
export function VatTab({ data, rolling }) {
  const s = data.summary || {}
  return (
    <>
      {rolling && (
        <Callout tone="warn">
          This window is a rolling stretch of days, so the first and last month below are only part of a month.
          For a VAT return, choose <strong>This month</strong> or <strong>Last month</strong> above.
        </Callout>
      )}
      {s.unfiledOrders > 0 && (
        <Callout tone="warn">
          {s.unfiledOrders} of these orders (VAT {money(s.unfiledVat)}) have not been filed with KRA through eTIMS, for example a delivered
          cash order that is still unpaid, or an invoice that failed. They are counted above because the goods were delivered; ask your
          accountant whether they belong in the return for this period.
        </Callout>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Total Orders (VAT)" value={s.totalOrders || 0} />
        <KpiTile label="Ex-VAT Revenue" value={money(s.totalExVat)} />
        <KpiTile label="VAT Collected" value={money(s.totalVat)} tone="good" />
        <KpiTile label="Incl. VAT Revenue" value={money(s.totalInclVat)} />
      </div>

      {/* For the return: standard-rated vs exempt goods, and delivery fees (not included in the Ex-VAT figure).
          Ask your accountant how delivery fees should be treated. */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiTile label="Taxable goods (before discount)" value={money(s.taxableSales)} />
        <KpiTile label="Exempt goods (before discount)" value={money(s.exemptSales)} />
        <KpiTile label="Delivery fees (not in Ex-VAT)" value={money(s.deliveryFees)} />
      </div>

      <DataTable
        title="Monthly VAT Summary (KRA Filing)"
        headers={[
          { label: 'Month' },
          { label: 'Orders', right: true },
          { label: 'Ex-VAT (KES)', right: true },
          { label: 'VAT (KES)', right: true },
          { label: 'Incl. VAT (KES)', right: true },
        ]}
        rows={data.rows || []}
        renderRow={(row, i) => (
          <tr key={i} className="hover:bg-admin-50 transition-colors">
            <td className={`${td} font-admin font-semibold text-admin-800`}>
              {new Date(row.year, row.month - 1).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}
            </td>
            <td className={`${td} text-right whitespace-nowrap font-admin text-admin-700`}>{row.orders}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin text-admin-700`}>{money(row.totalExVat)}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin font-bold text-admin-900`}>{money(row.totalVat)}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin text-admin-900 font-semibold`}>{money(row.totalInclVat)}</td>
          </tr>
        )}
      />
    </>
  )
}

// ── RIDERS ────────────────────────────────────────────────────────────────────
const fmtMins = (m) => (m == null ? '—' : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`)

export function RidersTab({ data }) {
  if (!data.riders?.length) {
    return (
      <div className="bg-white rounded-xl border border-admin-200 p-16 text-center">
        <Bike size={28} className="text-admin-300 mx-auto mb-3" aria-hidden="true" />
        <p className="text-admin-500 font-admin font-medium">No completed delivery orders with driver assignments in this period.</p>
        <p className="text-admin-500 text-xs font-admin mt-1">Delivery time runs from dispatch to delivered.</p>
      </div>
    )
  }
  return (
    <DataTable
      title="Rider Performance"
      headers={[
        { label: 'Driver', sort: r => r.driverName || '' },
        { label: 'Deliveries', right: true, sort: r => r.deliveries },
        { label: 'Avg Time', right: true, sort: r => r.avgDeliveryMinutes },
        { label: 'Fastest', right: true, sort: r => r.minDeliveryMinutes },
        { label: 'Slowest', right: true, sort: r => r.maxDeliveryMinutes },
        { label: 'Value Delivered', right: true, sort: r => r.totalRevenue },
      ]}
      rows={data.riders}
      renderRow={(r, i) => (
        <tr key={i} className="hover:bg-admin-50 transition-colors">
          <td className={td}>
            <p className="font-admin font-semibold text-admin-800">{r.driverName || 'Unknown'}</p>
            <p className="text-admin-500 text-xs font-admin">{r.driverPhone}</p>
          </td>
          <td className={`${td} text-right whitespace-nowrap font-admin font-bold text-admin-800`}>{r.deliveries}</td>
          <td className={`${td} text-right whitespace-nowrap font-admin text-admin-700`}>{fmtMins(r.avgDeliveryMinutes)}</td>
          <td className={`${td} text-right whitespace-nowrap font-admin text-green-700`}>{fmtMins(r.minDeliveryMinutes)}</td>
          <td className={`${td} text-right whitespace-nowrap font-admin text-amber-700`}>{fmtMins(r.maxDeliveryMinutes)}</td>
          <td className={`${td} text-right whitespace-nowrap font-admin font-bold text-admin-800`}>{money(r.totalRevenue)}</td>
        </tr>
      )}
    />
  )
}

// ── ONBOARDING (superadmin) ───────────────────────────────────────────────────
export function OnboardingTab({ data }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Tracked Users" value={data.totals?.users || 0} />
        <KpiTile label="Completed Tours" value={data.totals?.completedTours || 0} />
        <KpiTile label="Help Center Opens" value={data.totals?.helpCenterOpens || 0} />
        <KpiTile label="Milestones Reached" value={data.totals?.milestonesReached || 0} />
      </div>
      <DataTable
        title="Onboarding Adoption by Role"
        headers={[
          { label: 'Role' },
          { label: 'Users', right: true },
          { label: 'Completed Tours', right: true },
          { label: 'Avg Checklist %', right: true },
          { label: 'Help Opens', right: true },
          { label: 'Milestones', right: true },
        ]}
        rows={data.rows || []}
        renderRow={(row, i) => (
          <tr key={i} className="hover:bg-admin-50 transition-colors">
            <td className={`${td} font-admin font-semibold text-admin-800 capitalize`}>{row.role}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin text-admin-700`}>{row.userCount}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin text-admin-700`}>{row.completedTours}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin font-bold text-admin-900`}>{row.avgChecklistCompletion}%</td>
            <td className={`${td} text-right whitespace-nowrap font-admin text-admin-700`}>{row.helpCenterOpens}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin text-admin-700`}>{row.milestonesReached}</td>
          </tr>
        )}
      />
    </>
  )
}
