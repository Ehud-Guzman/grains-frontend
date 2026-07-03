import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Package, Users, CreditCard, TrendingUp, RefreshCw } from 'lucide-react'
import { adminAlertService } from '../../../services/admin/alert.service'
import { formatDate } from '../../../utils/helpers'
import Spinner from '../../../components/ui/Spinner'
import toast from 'react-hot-toast'

function AlertCard({ icon: Icon, title, tone, count, children }) {
  const toneClass = {
    red:    'bg-red-50 text-red-600 border-red-100',
    amber:  'bg-amber-50 text-amber-600 border-amber-100',
    blue:   'bg-blue-50 text-blue-600 border-blue-100',
    green:  'bg-green-50 text-green-600 border-green-100',
  }[tone]

  return (
    <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden">
      <div className="px-5 py-4 border-b border-admin-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${toneClass}`}>
            <Icon size={15} />
          </div>
          <h2 className="font-admin font-semibold text-admin-900">{title}</h2>
        </div>
        {count !== undefined && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-admin font-bold ${toneClass}`}>
            {count}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function AdminAlertsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await adminAlertService.getDashboard()
      setData(res.data.data)
    } catch {
      toast.error('Failed to load alerts')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!data) return null

  const { lowStock, dormantCustomers, paymentFailures, orderSpike } = data
  const dormantTotal = (dormantCustomers?.d30 || 0) + (dormantCustomers?.d60 || 0) + (dormantCustomers?.d90 || 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-admin font-bold text-admin-900">Alerts</h1>
          <p className="text-admin-400 text-sm font-admin mt-0.5">
            Signals that may need attention — refresh to check the latest state.
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-admin-200 rounded-lg
            text-sm font-admin font-medium text-admin-700 hover:bg-admin-50 transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Order spike */}
        <AlertCard icon={TrendingUp} title="Order Volume" tone={orderSpike.isSpike ? 'red' : 'green'}>
          {orderSpike.isSpike ? (
            <p className="text-sm font-admin text-admin-700">
              <strong className="text-red-600">Spike detected</strong> — {orderSpike.todayCount} orders today
              vs a {orderSpike.dailyAvg}/day trailing average.
            </p>
          ) : (
            <p className="text-sm font-admin text-admin-500">
              Normal — {orderSpike.todayCount} orders today, trailing average {orderSpike.dailyAvg}/day.
            </p>
          )}
        </AlertCard>

        {/* Low stock */}
        <AlertCard icon={Package} title="Low / Out of Stock" tone={lowStock.count > 0 ? 'amber' : 'green'} count={lowStock.count}>
          {lowStock.count === 0 ? (
            <p className="text-sm font-admin text-admin-500">All stock levels are healthy.</p>
          ) : (
            <div className="space-y-2">
              {lowStock.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm font-admin">
                  <span className="text-admin-700">{item.productName} — {item.varietyName} ({item.packagingSize})</span>
                  <span className={item.status === 'out_of_stock' ? 'text-red-600 font-semibold' : 'text-amber-600 font-semibold'}>
                    {item.stock} left
                  </span>
                </div>
              ))}
              <Link to="/admin/stock" className="inline-block mt-1 text-xs text-brand-600 hover:text-brand-700 font-admin font-medium">
                View full stock overview →
              </Link>
            </div>
          )}
        </AlertCard>

        {/* Dormant customers */}
        <AlertCard icon={Users} title="Dormant Customers" tone={dormantTotal > 0 ? 'blue' : 'green'} count={dormantTotal}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '30+ days', value: dormantCustomers.d30 },
              { label: '60+ days', value: dormantCustomers.d60 },
              { label: '90+ days', value: dormantCustomers.d90 },
            ].map(b => (
              <div key={b.label} className="bg-admin-50 rounded-lg py-2.5 text-center">
                <p className="font-admin font-bold text-admin-900 text-lg leading-none">{b.value}</p>
                <p className="text-admin-400 text-xs font-admin mt-1">{b.label}</p>
              </div>
            ))}
          </div>
          <Link to="/admin/customers" className="inline-block mt-3 text-xs text-brand-600 hover:text-brand-700 font-admin font-medium">
            View customers →
          </Link>
        </AlertCard>

        {/* Payment failures */}
        <AlertCard icon={CreditCard} title="Payment Failures (24h)" tone={paymentFailures.count > 0 ? 'red' : 'green'} count={paymentFailures.count}>
          {paymentFailures.count === 0 ? (
            <p className="text-sm font-admin text-admin-500">No payment failures in the last 24 hours.</p>
          ) : (
            <div className="space-y-2">
              {paymentFailures.items.slice(0, 8).map((f, i) => (
                <div key={i} className="text-sm font-admin text-admin-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
                    {f.detail?.reason || f.detail?.resultDesc || 'Payment failed'}
                  </span>
                  <span className="text-admin-400 text-xs">{formatDate(f.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </AlertCard>

      </div>
    </div>
  )
}
