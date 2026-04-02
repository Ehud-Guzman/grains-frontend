import { useState, useEffect } from 'react'
import {
  Download, TrendingUp, Package, Users, ShoppingCart, BarChart3, Printer, LifeBuoy
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { adminReportService } from '../../../services/admin/report.service'
import { formatKES } from '../../../utils/helpers'
import { useShopInfo } from '../../../context/AppSettingsContext'
import { OnboardingReturnLink } from '../../../components/onboarding/OnboardingEnhancements'
import Spinner from '../../../components/ui/Spinner'
import toast from 'react-hot-toast'

const TABS = [
  { key: 'sales',     label: 'Sales',     icon: TrendingUp   },
  { key: 'products',  label: 'Products',  icon: Package      },
  { key: 'stock',     label: 'Stock',     icon: BarChart3    },
  { key: 'customers', label: 'Customers', icon: Users        },
  { key: 'orders',    label: 'Orders',    icon: ShoppingCart },
  { key: 'onboarding', label: 'Onboarding', icon: LifeBuoy   },
]

const PERIODS = [
  { value: 'today', label: 'Today'     },
  { value: 'week',  label: '7 Days'    },
  { value: 'month', label: '30 Days'   },
  { value: 'year',  label: '12 Months' },
]

const BRAND = '#C8912A'

const STATUS_COLORS = {
  pending:          '#F59E0B',
  approved:         '#22C55E',
  preparing:        '#3B82F6',
  out_for_delivery: '#8B5CF6',
  completed:        '#14B8A6',
  rejected:         '#EF4444',
  cancelled:        '#9CA3AF',
}

// ── PRINT-ONLY STYLES ─────────────────────────────────────────────────────────
const PRINT_STYLES = `
  @media screen { .print-only { display: none !important; } }
  @media print  { .print-only { display: block !important; } }
`

// ── PRINT HEADER ──────────────────────────────────────────────────────────────
const PrintHeader = ({ shopInfo, tab, period }) => {
  const periodLabel = PERIODS.find(p => p.value === period)?.label ?? ''
  const periodText  = tab !== 'stock' && tab !== 'customers' ? `Period: ${periodLabel}` : 'All time'
  const today       = new Date().toLocaleDateString('en-KE', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="print-only mb-8 pb-6 border-b-2 border-admin-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/Vittorios-logo.jpeg"
            alt="Vittorios"
            style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover' }}
          />
          <div>
            <h1 className="text-xl font-bold text-admin-900" style={{ fontFamily: 'Georgia, serif' }}>
              {shopInfo.name}
            </h1>
            <p className="text-admin-500 text-xs mt-0.5">{shopInfo.tagline}</p>
            <div className="flex items-center gap-4 mt-1 text-xs text-admin-400">
              <span>📞 {shopInfo.phone}</span>
              <span>✉ {shopInfo.email}</span>
            </div>
          </div>
        </div>
        <div className="text-right text-sm text-admin-500 space-y-0.5">
          <p className="font-semibold text-admin-800 capitalize text-base">{tab} Report</p>
          <p>{periodText}</p>
          <p>Generated: {today}</p>
        </div>
      </div>
    </div>
  )
}

// ── PRINT FOOTER ──────────────────────────────────────────────────────────────
const PrintFooter = ({ shopInfo }) => (
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

// ── KPI TILE ──────────────────────────────────────────────────────────────────
const KpiTile = ({ label, value }) => (
  <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5">
    <p className="text-admin-400 text-xs font-admin uppercase tracking-wide mb-1.5">{label}</p>
    <p className="text-2xl font-admin font-bold text-admin-900 leading-tight">{value ?? '—'}</p>
  </div>
)

const OnboardingSummaryCard = ({ label, value, accent = 'brand' }) => (
  <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5">
    <p className="text-admin-400 text-xs font-admin uppercase tracking-wide mb-1.5">{label}</p>
    <p className={`text-2xl font-admin font-bold leading-tight ${
      accent === 'brand' ? 'text-brand-700' :
      accent === 'blue' ? 'text-blue-700' :
      accent === 'green' ? 'text-green-700' :
      'text-admin-900'
    }`}>
      {value ?? '—'}
    </p>
  </div>
)

// ── CUSTOM CHART TOOLTIP ──────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, valueFormatter }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-admin-200 rounded-xl shadow-admin p-3 text-sm font-admin">
      <p className="text-admin-500 text-xs mb-2 capitalize">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color || BRAND }}>
          {p.name}: {valueFormatter ? valueFormatter(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

// ── SALES LINE CHART ──────────────────────────────────────────────────────────
const SalesLineChart = ({ data }) => {
  if (!data?.length) return null

  const formatted = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
    revenue: Math.round(d.revenue),
    orders: d.orders,
  }))

  return (
    <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5">
      <h3 className="font-admin font-bold text-admin-900 mb-5">Revenue Over Time</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={formatted} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1EDE6" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#9E8E7A', fontFamily: 'Outfit' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9E8E7A', fontFamily: 'Outfit' }}
            axisLine={false} tickLine={false}
            tickFormatter={v => `${(v / 1000).toFixed(0)}K`}
          />
          <Tooltip
            content={<ChartTooltip valueFormatter={v => formatKES(v)} />}
          />
          <Line
            type="monotone" dataKey="revenue" name="Revenue"
            stroke={BRAND} strokeWidth={2.5}
            dot={{ r: 3, fill: BRAND, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: BRAND }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── TOP PRODUCTS HORIZONTAL BAR CHART ────────────────────────────────────────
const TopProductsChart = ({ data }) => {
  if (!data?.length) return null

  const top5 = data.slice(0, 5).map(p => ({
    name: p.productName.length > 22 ? p.productName.slice(0, 22) + '…' : p.productName,
    units: p.unitsSold,
  }))

  return (
    <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5">
      <h3 className="font-admin font-bold text-admin-900 mb-5">Top 5 Products by Units Sold</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={top5} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1EDE6" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#9E8E7A', fontFamily: 'Outfit' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            type="category" dataKey="name" width={148}
            tick={{ fontSize: 10, fill: '#9E8E7A', fontFamily: 'Outfit' }}
            axisLine={false} tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="units" name="Units Sold" fill={BRAND} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── ORDERS STATUS BAR CHART ───────────────────────────────────────────────────
const OrdersBarChart = ({ data }) => {
  if (!data?.length) return null

  const formatted = data.map(d => ({
    status: d._id.replace(/_/g, ' '),
    count: d.count,
    fill: STATUS_COLORS[d._id] || BRAND,
  }))

  return (
    <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5">
      <h3 className="font-admin font-bold text-admin-900 mb-5">Orders by Status</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={formatted} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1EDE6" vertical={false} />
          <XAxis
            dataKey="status"
            tick={{ fontSize: 11, fill: '#9E8E7A', fontFamily: 'Outfit', textTransform: 'capitalize' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9E8E7A', fontFamily: 'Outfit' }}
            axisLine={false} tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" name="Orders" radius={[6, 6, 0, 0]}>
            {formatted.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── DATA TABLE ────────────────────────────────────────────────────────────────
const DataTable = ({ title, headers, rows, renderRow, emptyMessage = 'No data for this period' }) => (
  <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden">
    {title && (
      <div className="px-5 py-4 border-b border-admin-100">
        <h3 className="font-admin font-bold text-admin-900">{title}</h3>
      </div>
    )}
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-admin">
        <thead>
          <tr className="bg-admin-50/60 border-b border-admin-100">
            {headers.map(h => (
              <th key={h.label}
                className={`px-5 py-3.5 text-xs text-admin-500 font-semibold uppercase tracking-wide
                  ${h.right ? 'text-right' : 'text-left'}`}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-admin-50">
          {!rows?.length ? (
            <tr>
              <td colSpan={headers.length}
                className="px-5 py-10 text-center text-admin-400 font-admin text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => renderRow(row, i))
          )}
        </tbody>
      </table>
    </div>
  </div>
)

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const shopInfo = useShopInfo()
  const [tab,       setTab]       = useState('sales')
  const [period,    setPeriod]    = useState('month')
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setData(null)
    try {
      const params = { period }
      let res
      if      (tab === 'sales')     res = await adminReportService.getSales(params)
      else if (tab === 'products')  res = await adminReportService.getBestSellers({ ...params, limit: 20 })
      else if (tab === 'stock')     res = await adminReportService.getStockValuation()
      else if (tab === 'customers') res = await adminReportService.getCustomers()
      else if (tab === 'orders')    res = await adminReportService.getOrders(params)
      else if (tab === 'onboarding') res = await adminReportService.getOnboarding()
      setData(res.data.data)
    } catch { /* errors handled by api interceptor */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [tab, period])

  const handleExport = async () => {
    setExporting(true)
    try {
      const typeMap = {
        sales: 'sales', products: 'best-sellers',
        stock: 'stock-valuation', customers: 'customers', orders: 'orders', onboarding: 'onboarding'
      }
      const res = await adminReportService.exportCSV(typeMap[tab], { period })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a   = document.createElement('a')
      a.href     = url
      a.download = `vittorios-${tab}-${period}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV downloaded')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  const handlePrint = () => window.print()

  return (
    <>
      <style>{PRINT_STYLES}</style>

      <div className="p-6 max-w-7xl mx-auto">

        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6" data-no-print>
          <div>
            <div className="mb-3">
              <OnboardingReturnLink />
            </div>
            <h1 className="text-2xl font-admin font-bold text-admin-900">Reports</h1>
            <p className="text-admin-400 text-xs font-admin mt-0.5">Analytics and data exports</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-admin-200
                text-admin-700 rounded-xl text-sm font-admin font-semibold
                hover:bg-admin-50 transition-colors shadow-admin">
              <Printer size={15} />
              Print
            </button>
            <button onClick={handleExport} disabled={exporting || loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl
                text-sm font-admin font-semibold hover:bg-brand-600 disabled:opacity-50
                transition-colors shadow-admin">
              <Download size={15} />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-admin-100 p-1 rounded-xl mb-5 overflow-x-auto" data-no-print>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-admin
                font-semibold transition-all whitespace-nowrap ${
                  tab === t.key
                    ? 'bg-white text-admin-900 shadow-admin'
                    : 'text-admin-500 hover:text-admin-700'
                }`}>
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Period filter ────────────────────────────────────────── */}
        {tab !== 'stock' && tab !== 'customers' && tab !== 'onboarding' && (
          <div className="flex gap-2 mb-5" data-no-print>
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-admin font-semibold
                  transition-all border ${
                    period === p.value
                      ? 'bg-admin-900 text-orange-500 border-admin-900 shadow-sm'
                      : 'bg-white border-admin-200 text-admin-600 hover:border-admin-400'
                  }`}>
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Print area (wraps all reportable content) ─────────────── */}
        <div className="print-area">

          <PrintHeader shopInfo={shopInfo} tab={tab} period={period} />

          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : !data ? (
            <div className="bg-white rounded-xl border border-admin-200 p-16 text-center">
              <BarChart3 size={28} className="text-admin-300 mx-auto mb-3" />
              <p className="text-admin-500 font-admin font-medium">No data available for this period</p>
            </div>
          ) : (
            <div className="space-y-5">

              {/* ── SALES ──────────────────────────────────────────── */}
              {tab === 'sales' && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiTile label="Total Revenue"   value={formatKES(data.summary?.totalRevenue)} />
                    <KpiTile label="Total Orders"    value={data.summary?.totalOrders} />
                    <KpiTile label="Avg Order Value" value={formatKES(data.summary?.avgOrderValue)} />
                    <KpiTile label="Items Sold"      value={data.summary?.totalItems} />
                  </div>

                  <SalesLineChart data={data.byDay} />

                  {data.byCategory?.length > 0 && (
                    <DataTable
                      title="Revenue by Category"
                      headers={[
                        { label: 'Category' },
                        { label: 'Units Sold', right: true },
                        { label: 'Revenue',    right: true },
                      ]}
                      rows={data.byCategory}
                      renderRow={(c, i) => (
                        <tr key={i} className="hover:bg-admin-50 transition-colors">
                          <td className="px-5 py-3.5 font-admin font-semibold text-admin-800">
                            {c._id || 'Uncategorized'}
                          </td>
                          <td className="px-5 py-3.5 text-right text-admin-600 font-admin">{c.unitsSold}</td>
                          <td className="px-5 py-3.5 text-right font-admin font-bold text-admin-800">
                            {formatKES(c.revenue)}
                          </td>
                        </tr>
                      )}
                    />
                  )}

                  {data.byPaymentMethod?.length > 0 && (
                    <DataTable
                      title="Revenue by Payment Method"
                      headers={[
                        { label: 'Method' },
                        { label: 'Orders',  right: true },
                        { label: 'Revenue', right: true },
                      ]}
                      rows={data.byPaymentMethod}
                      renderRow={(m, i) => (
                        <tr key={i} className="hover:bg-admin-50 transition-colors">
                          <td className="px-5 py-3.5 font-admin font-semibold text-admin-800 capitalize">
                            {m._id?.replace(/_/g, ' ') || '—'}
                          </td>
                          <td className="px-5 py-3.5 text-right text-admin-600 font-admin">{m.count}</td>
                          <td className="px-5 py-3.5 text-right font-admin font-bold text-admin-800">
                            {formatKES(m.revenue)}
                          </td>
                        </tr>
                      )}
                    />
                  )}
                </>
              )}

              {/* ── PRODUCTS ───────────────────────────────────────── */}
              {tab === 'products' && data.products && (
                <>
                  <TopProductsChart data={data.products} />

                  <DataTable
                    title="Best Selling Products"
                    headers={[
                      { label: '#' }, { label: 'Product' },
                      { label: 'Units Sold', right: true },
                      { label: 'Revenue',    right: true },
                    ]}
                    rows={data.products}
                    renderRow={(p, i) => (
                      <tr key={i} className="hover:bg-admin-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center
                            text-xs font-admin font-bold ${
                              i === 0 ? 'bg-amber-100 text-amber-700' :
                              i === 1 ? 'bg-admin-100 text-admin-600' :
                              i === 2 ? 'bg-orange-100 text-orange-600' :
                              'text-admin-400'
                            }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-admin font-semibold text-admin-800">{p.productName}</p>
                          <p className="text-admin-400 text-xs font-admin">{p.variety} · {p.packaging}</p>
                        </td>
                        <td className="px-5 py-3.5 text-right font-admin font-semibold text-admin-700">
                          {p.unitsSold}
                        </td>
                        <td className="px-5 py-3.5 text-right font-admin font-bold text-admin-800">
                          {formatKES(p.revenue)}
                        </td>
                      </tr>
                    )}
                  />
                </>
              )}

              {/* ── STOCK ──────────────────────────────────────────── */}
              {tab === 'stock' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <KpiTile label="Total Stock Value" value={formatKES(data.totalStockValueKES)} />
                    <KpiTile label="Line Items"        value={data.itemCount} />
                  </div>

                  <DataTable
                    title="Stock Valuation"
                    headers={[
                      { label: 'Product' },
                      { label: 'Stock',   right: true },
                      { label: 'Price',   right: true },
                      { label: 'Value',   right: true },
                    ]}
                    rows={data.rows?.slice(0, 50) || []}
                    renderRow={(r, i) => (
                      <tr key={i} className="hover:bg-admin-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-admin font-semibold text-admin-800">{r.productName}</p>
                          <p className="text-admin-400 text-xs font-admin">
                            {r.varietyName} · {r.packagingSize}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-right font-admin text-admin-700">{r.stock}</td>
                        <td className="px-5 py-3.5 text-right font-admin text-admin-500">
                          {formatKES(r.priceKES)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-admin font-bold text-admin-800">
                          {formatKES(r.totalValueKES)}
                        </td>
                      </tr>
                    )}
                  />
                </>
              )}

              {/* ── CUSTOMERS ──────────────────────────────────────── */}
              {tab === 'customers' && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Repeat Buyers',   value: data.repeat,    color: 'blue'  },
                      { label: 'High Value',       value: data.highValue, color: 'brand' },
                      { label: 'Inactive (30d+)', value: data.inactive,  color: 'red'   },
                    ].map(({ label, value, color }) => (
                      <div key={label}
                        className="bg-white rounded-xl border border-admin-200 shadow-admin p-5 text-center">
                        <p className={`text-3xl font-admin font-bold mb-1 ${
                          color === 'blue'  ? 'text-blue-700'    :
                          color === 'brand' ? 'text-brand-700'   : 'text-red-700'
                        }`}>{value}</p>
                        <p className="text-admin-400 text-xs font-admin uppercase tracking-wide">{label}</p>
                      </div>
                    ))}
                  </div>

                  <DataTable
                    title="Top Customers by Spend"
                    headers={[
                      { label: '#' }, { label: 'Customer' },
                      { label: 'Orders',      right: true },
                      { label: 'Total Spend', right: true },
                    ]}
                    rows={data.customers?.slice(0, 20) || []}
                    renderRow={(c, i) => (
                      <tr key={i} className="hover:bg-admin-50 transition-colors">
                        <td className="px-5 py-3.5 text-admin-400 font-admin font-medium">{i + 1}</td>
                        <td className="px-5 py-3.5">
                          <p className="font-admin font-semibold text-admin-800">{c.name}</p>
                          <p className="text-admin-400 text-xs font-admin">{c.phone}</p>
                        </td>
                        <td className="px-5 py-3.5 text-right font-admin text-admin-700">{c.totalOrders}</td>
                        <td className="px-5 py-3.5 text-right font-admin font-bold text-admin-800">
                          {formatKES(c.totalSpend)}
                        </td>
                      </tr>
                    )}
                  />
                </>
              )}

              {/* ── ORDERS ─────────────────────────────────────────── */}
              {tab === 'orders' && data.byStatus && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <KpiTile label="Avg Order Value" value={formatKES(data.avgOrderValue)} />
                    <KpiTile label="Total Orders"
                      value={data.byStatus.reduce((a, s) => a + s.count, 0)} />
                  </div>

                  <OrdersBarChart data={data.byStatus} />

                  <DataTable
                    title="Orders by Status"
                    headers={[
                      { label: 'Status' },
                      { label: 'Count',       right: true },
                      { label: 'Total Value', right: true },
                    ]}
                    rows={data.byStatus}
                    renderRow={(s, i) => (
                      <tr key={i} className="hover:bg-admin-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: STATUS_COLORS[s._id] || BRAND }}
                            />
                            <span className="font-admin font-semibold text-admin-800 capitalize">
                              {s._id?.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-admin text-admin-700">{s.count}</td>
                        <td className="px-5 py-3.5 text-right font-admin font-bold text-admin-800">
                          {formatKES(s.totalValue)}
                        </td>
                      </tr>
                    )}
                  />
                </>
              )}

              {tab === 'onboarding' && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <OnboardingSummaryCard label="Tracked Users" value={data.totals?.users || 0} />
                    <OnboardingSummaryCard label="Completed Tours" value={data.totals?.completedTours || 0} accent="brand" />
                    <OnboardingSummaryCard label="Help Center Opens" value={data.totals?.helpCenterOpens || 0} accent="blue" />
                    <OnboardingSummaryCard label="Milestones Reached" value={data.totals?.milestonesReached || 0} accent="green" />
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
                        <td className="px-5 py-3.5 font-admin font-semibold text-admin-800 capitalize">
                          {row.role}
                        </td>
                        <td className="px-5 py-3.5 text-right font-admin text-admin-700">{row.userCount}</td>
                        <td className="px-5 py-3.5 text-right font-admin text-admin-700">{row.completedTours}</td>
                        <td className="px-5 py-3.5 text-right font-admin font-bold text-brand-700">{row.avgChecklistCompletion}%</td>
                        <td className="px-5 py-3.5 text-right font-admin text-admin-700">{row.helpCenterOpens}</td>
                        <td className="px-5 py-3.5 text-right font-admin text-admin-700">{row.milestonesReached}</td>
                      </tr>
                    )}
                  />
                </>
              )}

            </div>
          )}

          {data && <PrintFooter shopInfo={shopInfo} />}

        </div>{/* end .print-area */}
      </div>
    </>
  )
}
