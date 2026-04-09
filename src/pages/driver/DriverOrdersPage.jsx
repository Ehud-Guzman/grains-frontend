import { useState, useEffect } from 'react'
import { Truck, MapPin, Phone, Package, CheckCircle, Clock, Filter } from 'lucide-react'
import { driverService } from '../../services/driver.service'
import { formatKES, formatDate } from '../../utils/helpers'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

const STATUS_TABS = [
  { value: '',                  label: 'All'         },
  { value: 'out_for_delivery',  label: 'Active'      },
  { value: 'preparing',         label: 'Preparing'   },
  { value: 'completed',         label: 'Completed'   },
]

const STATUS_CONFIG = {
  out_for_delivery: { bg: 'bg-brand-50',   text: 'text-brand-700',   border: 'border-brand-200'   },
  preparing:        { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200'  },
  completed:        { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200'   },
  cancelled:        { bg: 'bg-admin-50',   text: 'text-admin-500',   border: 'border-admin-200'   },
}

function OrderRow({ order, onComplete }) {
  const [completing, setCompleting] = useState(false)
  const customer = order.userId || order.guestId
  const isActive = order.status === 'out_for_delivery'
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.cancelled

  const handleComplete = async () => {
    setCompleting(true)
    try {
      await driverService.completeDelivery(order._id)
      toast.success('Delivery completed')
      onComplete(order._id)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete')
    } finally { setCompleting(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-admin-100 shadow-sm p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-admin font-bold text-admin-900 text-sm">{order.orderRef}</p>
          <p className="text-xs font-admin text-admin-400">{formatDate(order.createdAt)}</p>
        </div>
        <span className={`text-xs font-admin font-semibold px-2.5 py-1 rounded-full border capitalize
          ${cfg.bg} ${cfg.text} ${cfg.border}`}>
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Customer contact */}
      {customer && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone size={13} className="text-admin-400" />
            <span className="text-sm font-admin text-admin-700 font-medium">{customer.name}</span>
          </div>
          <a href={`tel:${customer.phone}`}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-50 border border-green-200
              text-green-700 rounded-lg text-xs font-admin font-semibold hover:bg-green-100 transition-colors">
            <Phone size={11} /> Call
          </a>
        </div>
      )}

      {/* Address */}
      {order.deliveryAddress && (
        <div className="flex items-start gap-2 px-3 py-2 bg-admin-50 rounded-xl">
          <MapPin size={13} className="text-admin-400 mt-0.5 flex-shrink-0" />
          <span className="text-sm font-admin text-admin-700">{order.deliveryAddress}</span>
        </div>
      )}

      {/* Items & total */}
      <div className="flex items-center justify-between px-3 py-2 bg-admin-50 rounded-xl">
        <div className="flex items-center gap-2">
          <Package size={13} className="text-admin-400" />
          <span className="text-xs font-admin text-admin-600">
            {order.orderItems?.length || 0} item{order.orderItems?.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="text-sm font-admin font-bold text-admin-800">{formatKES(order.total)}</span>
      </div>

      {/* Special instructions */}
      {order.specialInstructions && (
        <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs font-admin text-amber-700">
            <span className="font-semibold">Note: </span>{order.specialInstructions}
          </p>
        </div>
      )}

      {/* Complete button */}
      {isActive && (
        <button onClick={handleComplete} disabled={completing}
          className="w-full py-2.5 bg-green-500 text-white rounded-xl text-sm font-admin font-semibold
            hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
          <CheckCircle size={15} />
          {completing ? 'Marking…' : 'Mark as Delivered'}
        </button>
      )}
    </div>
  )
}

export default function DriverOrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = activeTab ? { status: activeTab } : {}
      const res = await driverService.getMyOrders(params)
      setOrders(res.data.data || [])
    } catch { toast.error('Failed to load orders') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [activeTab])

  const handleComplete = (id) => setOrders(o => o.filter(x => x._id !== id))

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-admin font-bold text-admin-900">My Orders</h1>
        <p className="text-sm font-admin text-admin-400 mt-0.5">All orders assigned to you</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-admin-100 rounded-xl p-1 shadow-sm overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <button key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-admin font-medium transition-colors
              ${activeTab === tab.value
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-admin-500 hover:text-admin-700 hover:bg-admin-50'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-admin-100 shadow-sm p-10 text-center">
          <Truck size={32} className="text-admin-200 mx-auto mb-3" />
          <p className="font-admin font-semibold text-admin-500">No orders found</p>
          <p className="text-sm font-admin text-admin-400 mt-1">
            {activeTab ? `No ${activeTab.replace(/_/g, ' ')} orders` : 'No orders assigned yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {orders.map(o => (
            <OrderRow key={o._id} order={o} onComplete={handleComplete} />
          ))}
        </div>
      )}
    </div>
  )
}
