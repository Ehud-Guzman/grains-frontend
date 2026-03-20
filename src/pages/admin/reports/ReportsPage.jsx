import { useState, useEffect } from 'react'
import { Download, TrendingUp, Package, Users, ShoppingCart, BarChart3, ArrowUpRight } from 'lucide-react'
import { adminReportService } from '../../../services/admin/report.service'
import { formatKES } from '../../../utils/helpers'
import Spinner from '../../../components/ui/Spinner'
import toast from 'react-hot-toast'

const TABS = [
  { key: 'sales',     label: 'Sales',     icon: TrendingUp  },
  { key: 'products',  label: 'Products',  icon: Package     },
  { key: 'stock',     label: 'Stock',     icon: BarChart3   },
  { key: 'customers', label: 'Customers', icon: Users       },
  { key: 'orders',    label: 'Orders',    icon: ShoppingCart},
]

const PERIODS = [
  { value: 'today', label: 'Today'     },
  { value: 'week',  label: '7 Days'    },
  { value: 'month', label: '30 Days'   },
  { value: 'year',  label: '12 Months' },
]

// ── KPI TILE ──────────────────────────────────────────────────────────────────
const KpiTile = ({ label, value }) => (
  <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-5">
    <p className="text-admin-400 text-xs font-admin uppercase tracking-wide mb-1.5">{label}</p>
    <p className="text-2xl font-admin font-bold text-admin-900 leading-tight">{value ?? '—'}</p>
  </div>
)

// ── TABLE WRAPPER ─────────────────────────────────────────────────────────────
const DataTable = ({ title, headers, rows, renderRow }) => (
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
          {rows.map((row, i) => renderRow(row, i))}
        </tbody>
      </table>
    </div>
  </div>
)

export default function ReportsPage() {
  const [tab, setTab]       = useState('sales')
  const [period, setPeriod] = useState('month')
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setData(null)
    try {
      const params = { period }
      let res
      if (tab === 'sales')     res = await adminReportService.getSales(params)
      else if (tab === 'products') res = await adminReportService.getBestSellers({ ...params, limit: 20 })
      else if (tab === 'stock')    res = await adminReportService.getStockValuation()
      else if (tab === 'customers') res = await adminReportService.getCustomers()
      else if (tab === 'orders')    res = await adminReportService.getOrders(params)
      setData(res.data.data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [tab, period])

  const handleExport = async () => {
    setExporting(true)
    try {
      const typeMap = { sales: 'sales', products: 'best-sellers', stock: 'stock-valuation', customers: 'customers', orders: 'orders' }
      const res = await adminReportService.exportCSV(typeMap[tab], { period })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${tab}-report-${period}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV downloaded')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-admin font-bold text-admin-900">Reports</h1>
          <p className="text-admin-400 text-xs font-admin mt-0.5">Analytics and data exports</p>
        </div>
        <button onClick={handleExport} disabled={exporting || loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl
            text-sm font-admin font-semibold hover:bg-brand-600 disabled:opacity-50
            transition-colors shadow-admin">
          <Download size={15} />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-admin-100 p-1 rounded-xl mb-5 overflow-x-auto">
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

      {/* ── Period filter ──────────────────────────────────────────── */}
      {tab !== 'stock' && tab !== 'customers' && (
        <div className="flex gap-2 mb-5">
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

      {/* ── Content ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : !data ? (
        <div className="bg-white rounded-xl border border-admin-200 p-16 text-center">
          <BarChart3 size={28} className="text-admin-300 mx-auto mb-3" />
          <p className="text-admin-500 font-admin font-medium">No data available for this period</p>
        </div>
      ) : (
        <div className="space-y-5">

          {/* ── SALES ──────────────────────────────────────────────── */}
          {tab === 'sales' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiTile label="Total Revenue"    value={formatKES(data.summary?.totalRevenue)} />
                <KpiTile label="Total Orders"     value={data.summary?.totalOrders} />
                <KpiTile label="Avg Order Value"  value={formatKES(data.summary?.avgOrderValue)} />
                <KpiTile label="Items Sold"       value={data.summary?.totalItems} />
              </div>

              {data.byCategory?.length > 0 && (
                <DataTable
                  title="Revenue by Category"
                  headers={[
                    { label: 'Category' }, { label: 'Units Sold', right: true }, { label: 'Revenue', right: true }
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
            </>
          )}

          {/* ── PRODUCTS ───────────────────────────────────────────── */}
          {tab === 'products' && data.products && (
            <DataTable
              title="Best Selling Products"
              headers={[
                { label: '#' }, { label: 'Product' },
                { label: 'Units Sold', right: true }, { label: 'Revenue', right: true }
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
          )}

          {/* ── STOCK ──────────────────────────────────────────────── */}
          {tab === 'stock' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <KpiTile label="Total Stock Value" value={formatKES(data.totalStockValueKES)} />
                <KpiTile label="Line Items"        value={data.itemCount} />
              </div>
              <DataTable
                headers={[
                  { label: 'Product' }, { label: 'Stock', right: true },
                  { label: 'Price', right: true }, { label: 'Value', right: true }
                ]}
                rows={data.rows?.slice(0, 50) || []}
                renderRow={(r, i) => (
                  <tr key={i} className="hover:bg-admin-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-admin font-semibold text-admin-800">{r.productName}</p>
                      <p className="text-admin-400 text-xs font-admin">{r.varietyName} · {r.packagingSize}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right font-admin text-admin-700">{r.stock}</td>
                    <td className="px-5 py-3.5 text-right font-admin text-admin-500">{formatKES(r.priceKES)}</td>
                    <td className="px-5 py-3.5 text-right font-admin font-bold text-admin-800">
                      {formatKES(r.totalValueKES)}
                    </td>
                  </tr>
                )}
              />
            </>
          )}

          {/* ── CUSTOMERS ──────────────────────────────────────────── */}
          {tab === 'customers' && (
            <>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Repeat Buyers',    value: data.repeat,   color: 'blue'  },
                  { label: 'High Value',       value: data.highValue, color: 'brand' },
                  { label: 'Inactive (30d+)', value: data.inactive,  color: 'red'   },
                ].map(({ label, value, color }) => (
                  <div key={label}
                    className="bg-white rounded-xl border border-admin-200 shadow-admin p-5 text-center">
                    <p className={`text-3xl font-admin font-bold mb-1 ${
                      color === 'blue' ? 'text-blue-700' :
                      color === 'brand' ? 'text-brand-700' : 'text-red-700'
                    }`}>{value}</p>
                    <p className="text-admin-400 text-xs font-admin uppercase tracking-wide">{label}</p>
                  </div>
                ))}
              </div>

              <DataTable
                title="Top Customers by Spend"
                headers={[
                  { label: '#' }, { label: 'Customer' },
                  { label: 'Orders', right: true }, { label: 'Total Spend', right: true }
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

          {/* ── ORDERS ─────────────────────────────────────────────── */}
          {tab === 'orders' && data.byStatus && (
            <>
              {data.avgOrderValue && (
                <div className="grid grid-cols-2 gap-4">
                  <KpiTile label="Avg Order Value" value={formatKES(data.avgOrderValue)} />
                  <KpiTile label="Total Orders"    value={data.byStatus.reduce((a, s) => a + s.count, 0)} />
                </div>
              )}
              <DataTable
                title="Orders by Status"
                headers={[
                  { label: 'Status' },
                  { label: 'Count', right: true },
                  { label: 'Total Value', right: true }
                ]}
                rows={data.byStatus}
                renderRow={(s, i) => (
                  <tr key={i} className="hover:bg-admin-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-admin font-semibold text-admin-800 capitalize">{s._id}</span>
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
        </div>
      )}
    </div>
  )
}