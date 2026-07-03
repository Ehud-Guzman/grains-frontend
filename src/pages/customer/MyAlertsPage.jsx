import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Bell, TrendingDown, PackageCheck, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { customerAlertService } from '../../services/customerAlert.service'
import { formatKES, formatDate } from '../../utils/helpers'
import Spinner from '../../components/ui/Spinner'

const TYPE_META = {
  back_in_stock: { label: 'Back in stock', icon: PackageCheck, color: 'text-green-600 bg-green-50' },
  price_drop:    { label: 'Price drop',     icon: TrendingDown, color: 'text-blue-600 bg-blue-50' },
}

export default function MyAlertsPage() {
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await customerAlertService.getMyAlerts()
      setAlerts(res.data?.data || [])
    } catch { toast.error('Failed to load alerts') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleRemove = async (id) => {
    setRemoving(id)
    try {
      await customerAlertService.unsubscribe(id)
      setAlerts(prev => prev.filter(a => a._id !== id))
      toast.success('Alert removed')
    } catch { toast.error('Could not remove alert') }
    finally { setRemoving(null) }
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Top bar */}
      <div className="bg-white border-b border-earth-100 sticky top-0 z-10">
        <div className="container-page max-w-2xl h-14 flex items-center gap-3">
          <Link to="/dashboard"
            className="p-1.5 rounded-lg text-earth-500 hover:text-earth-800 hover:bg-earth-100 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-brand-600" />
            <span className="font-display font-bold text-earth-900 text-base">My Alerts</span>
          </div>
        </div>
      </div>

      <div className="container-page max-w-2xl py-5">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-earth-100 shadow-warm p-8 text-center">
            <Bell size={28} className="text-earth-300 mx-auto mb-3" />
            <p className="text-earth-700 font-body font-semibold">No active alerts</p>
            <p className="text-earth-400 text-sm font-body mt-1 mb-4">
              Turn on "Notify me when back in stock" or "Alert me if price drops" on any product page.
            </p>
            <Link to="/shop"
              className="inline-flex items-center gap-1.5 text-sm text-brand-600 font-body font-semibold
                hover:text-brand-700 bg-brand-50 px-4 py-2 rounded-xl transition-colors">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {alerts.map(alert => {
              const meta = TYPE_META[alert.type] || TYPE_META.back_in_stock
              const Icon = meta.icon
              return (
                <div key={alert._id}
                  className="bg-white rounded-xl border border-earth-100 shadow-warm p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body font-semibold text-earth-800 truncate">
                      {alert.productId?.name || alert.productName}
                    </p>
                    <p className="text-earth-400 text-xs font-body mt-0.5">
                      {alert.varietyName} · {alert.packaging} · {meta.label}
                      {alert.type === 'price_drop' && alert.priceAtSubscription
                        ? ` · was ${formatKES(alert.priceAtSubscription)}` : ''}
                    </p>
                    <p className="text-earth-300 text-xs font-body mt-0.5">
                      Subscribed {formatDate(alert.createdAt)}
                    </p>
                  </div>
                  <button onClick={() => handleRemove(alert._id)} disabled={removing === alert._id}
                    className="p-2 text-earth-400 hover:text-red-500 hover:bg-red-50 rounded-lg
                      transition-colors flex-shrink-0 disabled:opacity-50">
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
