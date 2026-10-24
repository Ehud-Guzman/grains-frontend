import { Link } from 'react-router-dom'
import DataTable from './ReportTable'
import { KpiTile, ChangeBadge, Card, SalesLineChart, TopProductsChart, OrdersBarChart, HoursChart, STATUS_COLORS } from './reportUi'
import { money, paymentLabel, humanise } from './reportFormat'
import { spanDays } from './reportPeriods'

const td = 'px-3 sm:px-5 py-3.5'
const share = (part, whole) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—')

// "the previous 30 days", or "yesterday" when the period is a single day.
const previousCaption = (previous) => {
  const n = spanDays(previous)
  return n === 1 ? 'yesterday' : `the previous ${n} days`
}

// ── SALES ─────────────────────────────────────────────────────────────────────
export function SalesTab({ data }) {
  const s = data.summary || {}
  const prev = data.previous
  const caption = prev ? previousCaption(prev) : ''
  const delta = (now, before) => (prev ? <ChangeBadge now={now} before={before} caption={caption} /> : null)
  // Units sold = the categories added up. (The API's own "items" figure counts order LINES, not units.)
  const unitsSold = (data.byCategory || []).reduce((n, c) => n + (c.unitsSold || 0), 0)
  const hasPaidSplit = typeof s.paidRevenue === 'number'
  const paidPct = s.totalRevenue > 0 ? Math.round((s.paidRevenue / s.totalRevenue) * 100) : 0

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label="Total Revenue" value={money(s.totalRevenue)} delta={delta(s.totalRevenue, prev?.totalRevenue)} />
        <KpiTile label="Total Orders" value={s.totalOrders} delta={delta(s.totalOrders, prev?.totalOrders)} />
        <KpiTile label="Avg Order Value" value={money(s.avgOrderValue)} delta={delta(s.avgOrderValue, prev?.avgOrderValue)} />
        <KpiTile label="Units Sold" value={unitsSold.toLocaleString('en-KE')} sub="bags and packs, all products" />
      </div>

      {/* Revenue counts orders from approval onwards, paid or not (cash on delivery and pay on pickup are paid
          later), so say how much of it is actually in hand. */}
      {hasPaidSplit && s.totalOrders > 0 && (
        <Card title="Collected vs still to collect" subtitle="Of the revenue above, how much has been paid and how much is still owed.">
          <div className="h-3 rounded-full bg-amber-100 overflow-hidden" role="img"
            aria-label={`${paidPct}% of revenue is paid, ${100 - paidPct}% is still to collect`}>
            <div className="h-full rounded-full bg-shell-500 transition-[width] duration-500" style={{ width: `${paidPct}%` }} />
          </div>
          <dl className="grid grid-cols-2 gap-4 mt-4 text-sm font-admin">
            <div>
              <dt className="flex items-center gap-2 text-admin-600"><span aria-hidden="true" className="w-2 h-2 rounded-full bg-shell-500" /> Paid ({paidPct}%)</dt>
              <dd className="font-bold text-admin-900 text-lg">{money(s.paidRevenue)}</dd>
              <dd className="text-xs text-admin-500">{s.paidOrders} order{s.paidOrders === 1 ? '' : 's'}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-admin-600"><span aria-hidden="true" className="w-2 h-2 rounded-full bg-amber-400" /> Still to collect ({100 - paidPct}%)</dt>
              <dd className={`font-bold text-lg ${s.unpaidRevenue > 0 ? 'text-amber-700' : 'text-admin-900'}`}>{money(s.unpaidRevenue)}</dd>
              <dd className="text-xs text-admin-500">{s.unpaidOrders} order{s.unpaidOrders === 1 ? '' : 's'}</dd>
            </div>
          </dl>
        </Card>
      )}

      {/* What "Total Revenue" is made of. It is what customers paid, so it includes delivery fees and VAT; the
          category table below is NET goods sales. This card bridges the two. */}
      {s.breakdown && (
        <Card title="How the total is made up">
          <dl className={`grid grid-cols-2 ${s.breakdown.rounding > 0 ? 'md:grid-cols-6' : 'md:grid-cols-5'} gap-4 text-sm font-admin`}>
            <div><dt className="text-admin-500">Goods sold</dt><dd className="font-semibold text-admin-900">{money(s.breakdown.goodsSubtotal)}</dd></div>
            <div><dt className="text-admin-500">Coupon discounts</dt><dd className="font-semibold text-admin-900">− {money(s.breakdown.couponDiscounts)}</dd></div>
            <div><dt className="text-admin-500">Delivery fees</dt><dd className="font-semibold text-admin-900">+ {money(s.breakdown.deliveryFees)}</dd></div>
            <div><dt className="text-admin-500">VAT collected</dt><dd className="font-semibold text-admin-900">+ {money(s.breakdown.vatCollected)}</dd></div>
            {s.breakdown.rounding > 0 && (
              <div><dt className="text-admin-500">Rounding</dt><dd className="font-semibold text-admin-900">+ {money(s.breakdown.rounding)}</dd></div>
            )}
            <div><dt className="text-admin-500">= Total revenue</dt><dd className="font-bold text-brand-700">{money(s.totalRevenue)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-admin-500">
            Net goods sales (what the category table adds up to): {money(s.breakdown.netGoods)}.
            Delivery fees and VAT are collected from customers but are not sales of goods.
          </p>
        </Card>
      )}

      <SalesLineChart data={data.byDay} />

      {data.byCategory?.length > 0 && (
        <DataTable
          title="Revenue by Category"
          headers={[
            { label: 'Category' },
            { label: 'Units Sold', right: true },
            { label: 'Revenue', right: true },
            { label: 'Share', right: true },
          ]}
          rows={data.byCategory}
          renderRow={(c, i) => (
            <tr key={i} className="hover:bg-admin-50 transition-colors">
              <td className={`${td} font-admin font-semibold text-admin-800`}>{c._id || 'Uncategorized'}</td>
              <td className={`${td} text-right whitespace-nowrap text-admin-600 font-admin`}>{c.unitsSold}</td>
              <td className={`${td} text-right whitespace-nowrap font-admin font-bold text-admin-800`}>{money(c.revenue)}</td>
              <td className={`${td} text-right whitespace-nowrap font-admin text-admin-500`}>{share(c.revenue, s.breakdown?.netGoods)}</td>
            </tr>
          )}
        />
      )}

      {data.byPaymentMethod?.length > 0 && (
        <DataTable
          title="Revenue by Payment Method"
          headers={[
            { label: 'Method' },
            { label: 'Orders', right: true },
            { label: 'Revenue', right: true },
            { label: 'Share', right: true },
          ]}
          rows={[...data.byPaymentMethod].sort((a, b) => b.revenue - a.revenue)}
          renderRow={(m, i) => (
            <tr key={i} className="hover:bg-admin-50 transition-colors">
              <td className={`${td} font-admin font-semibold text-admin-800`}>{paymentLabel(m._id)}</td>
              <td className={`${td} text-right whitespace-nowrap text-admin-600 font-admin`}>{m.count}</td>
              <td className={`${td} text-right whitespace-nowrap font-admin font-bold text-admin-800`}>{money(m.revenue)}</td>
              <td className={`${td} text-right whitespace-nowrap font-admin text-admin-500`}>{share(m.revenue, s.totalRevenue)}</td>
            </tr>
          )}
        />
      )}
    </>
  )
}

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
export function ProductsTab({ data }) {
  if (!data.products) return null
  return (
    <>
      <TopProductsChart data={data.products} />
      <DataTable
        title="Best Selling Products"
        headers={[
          { label: '#' }, { label: 'Product' },
          { label: 'Units Sold', right: true },
          { label: 'Revenue', right: true },
        ]}
        rows={data.products}
        renderRow={(p, i) => (
          <tr key={i} className="hover:bg-admin-50 transition-colors">
            <td className={td}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-admin font-bold ${
                i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-admin-100 text-admin-600'
                  : i === 2 ? 'bg-orange-100 text-orange-600' : 'text-admin-500'
              }`}>{i + 1}</span>
            </td>
            <td className={td}>
              <p className="font-admin font-semibold text-admin-800">{p.productName}</p>
              <p className="text-admin-500 text-xs font-admin">{p.variety} · {p.packaging}</p>
            </td>
            <td className={`${td} text-right whitespace-nowrap font-admin font-semibold text-admin-700`}>{p.unitsSold}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin font-bold text-admin-800`}>{money(p.revenue)}</td>
          </tr>
        )}
      />
    </>
  )
}

// ── ORDERS ────────────────────────────────────────────────────────────────────
export function OrdersTab({ data }) {
  if (!data.byStatus) return null
  const total = data.byStatus.reduce((a, s) => a + s.count, 0)
  const lost = data.byStatus.filter(s => ['cancelled', 'rejected'].includes(s._id)).reduce((a, s) => a + s.count, 0)
  const lostPct = total > 0 ? Math.round((lost / total) * 100) : 0
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiTile label="Orders Placed" value={total.toLocaleString('en-KE')} sub="every status, including pending, cancelled and rejected" />
        <KpiTile label="Avg Order Value" value={money(data.avgOrderValue)} sub="approved and completed orders only" />
        <KpiTile label="Cancelled or Rejected" value={lost.toLocaleString('en-KE')} sub={`${lostPct}% of orders placed`}
          tone={lostPct >= 15 ? 'warn' : undefined} />
      </div>

      <OrdersBarChart data={data.byStatus} />
      <HoursChart data={data.byHour} />

      <DataTable
        title="Status Breakdown"
        headers={[
          { label: 'Status' },
          { label: 'Count', right: true },
          { label: 'Share', right: true },
          { label: 'Total Value', right: true },
        ]}
        rows={data.byStatus}
        renderRow={(s, i) => (
          <tr key={i} className="hover:bg-admin-50 transition-colors">
            <td className={td}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[s._id] || '#9CA3AF' }} />
                <span className="font-admin font-semibold text-admin-800">{humanise(s._id)}</span>
              </div>
            </td>
            <td className={`${td} text-right whitespace-nowrap font-admin text-admin-700`}>{s.count}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin text-admin-500`}>{share(s.count, total)}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin font-bold text-admin-800`}>{money(s.totalValue)}</td>
          </tr>
        )}
      />
    </>
  )
}

// ── CUSTOMERS ─────────────────────────────────────────────────────────────────
const SEGMENTS = [
  { key: 'all',       label: 'All customers',   field: 'total',     hint: 'Everyone who has ordered' },
  { key: 'repeat',    label: 'Repeat buyers',   field: 'repeat',    hint: '3 or more orders' },
  { key: 'highValue', label: 'High value',      field: 'highValue', hint: 'Top 10% by spend' },
  { key: 'inactive',  label: 'Inactive (30d+)', field: 'inactive',  hint: 'No order in 30 days' },
]

export function CustomersTab({ data, segment, onSegment, onPage }) {
  if (data.customers === undefined) return null
  const current = SEGMENTS.find(s => s.key === segment) || SEGMENTS[0]
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" role="group" aria-label="Customer segment" data-no-print>
        {SEGMENTS.map(seg => {
          const on = seg.key === segment
          return (
            <button key={seg.key} type="button" onClick={() => onSegment(seg.key)} aria-pressed={on}
              className={`text-left rounded-xl border p-4 transition-colors ${
                on ? 'bg-shell-50 border-shell-400 ring-1 ring-shell-400' : 'bg-white border-admin-200 hover:border-admin-300'} shadow-admin`}>
              <p className="text-xs font-admin uppercase tracking-wide text-admin-500">{seg.label}</p>
              <p className={`text-2xl font-admin font-bold mt-1 tabular-nums ${seg.key === 'inactive' && data.inactive > 0 ? 'text-amber-700' : 'text-admin-900'}`}>
                {(data[seg.field] ?? 0).toLocaleString('en-KE')}
              </p>
              <p className="text-xs font-admin text-admin-500 mt-0.5">{seg.hint}</p>
            </button>
          )
        })}
      </div>

      <DataTable
        title={segment === 'inactive' ? 'Customers who have stopped ordering' : `${current.label} by spend`}
        subtitle={segment === 'inactive'
          ? 'Biggest spenders first: the ones worth a call. Click a name to open their profile.'
          : 'Search covers the page you are on. Click a name to open their profile.'}
        headers={[
          { label: '#', className: 'hidden sm:table-cell' }, { label: 'Customer' },
          { label: 'Orders', right: true, className: 'hidden sm:table-cell' },
          { label: 'Last order', right: true },
          { label: 'Total Spend', right: true },
        ]}
        rows={data.customers}
        searchText={(c) => `${c.name} ${c.phone}`}
        pagination={data.pagination ? { ...data.pagination, onPage } : undefined}
        emptyMessage={segment === 'inactive' ? 'Nobody has stopped ordering — every customer has ordered in the last 30 days' : 'No customers yet'}
        renderRow={(c, i) => (
          <tr key={c._id || i} className="hover:bg-admin-50 transition-colors">
            <td className={`${td} hidden sm:table-cell text-admin-500 font-admin font-medium`}>
              {((data.pagination?.page || 1) - 1) * (data.pagination?.limit || 0) + i + 1}
            </td>
            <td className={td}>
              <Link to={`/admin/customers/${c._id}`} className="font-admin font-semibold text-admin-800 hover:text-brand-700 hover:underline">{c.name}</Link>
              <p className="text-admin-500 text-xs font-admin">{c.phone}</p>
            </td>
            <td className={`${td} hidden sm:table-cell text-right whitespace-nowrap font-admin text-admin-700`}>{c.totalOrders}</td>
            <td className={`${td} text-right whitespace-nowrap font-admin text-xs ${c.isInactive ? 'text-amber-700 font-semibold' : 'text-admin-500'}`}>
              {c.daysSinceLastOrder === 0 ? 'today' : `${c.daysSinceLastOrder} day${c.daysSinceLastOrder === 1 ? '' : 's'} ago`}
            </td>
            <td className={`${td} text-right whitespace-nowrap font-admin font-bold text-admin-800`}>{money(c.totalSpend)}</td>
          </tr>
        )}
      />
    </>
  )
}
