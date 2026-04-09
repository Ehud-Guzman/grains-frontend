import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Truck, CheckCircle, Clock, ToggleLeft, ToggleRight, MapPin, Phone, Package, Camera, AlertCircle } from 'lucide-react'
import { driverService } from '../../services/driver.service'
import { authService } from '../../services/auth.service'
import { useAuth } from '../../context/AuthContext'
import { formatKES, formatDate } from '../../utils/helpers'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

// ─── AVATAR UPLOADER (PREMIUM POLISH) ──────────────────────────────────────────
function AvatarUploader({ avatarURL, name, onUpload }) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef()

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result)
    reader.readAsDataURL(file)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const res = await authService.uploadAvatar(formData)
      onUpload(res.data.data.avatarURL)
      setPreview(null)
      toast.success('Profile photo updated')
    } catch (err) {
      setPreview(null)
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const displayImg = preview || avatarURL
  const initial = name?.charAt(0).toUpperCase()

  return (
    <div className="relative group flex-shrink-0">
      <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-md ring-1 ring-admin-100
        bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center relative transition-all duration-200 group-hover:shadow-lg">
        {displayImg ? (
          <img src={displayImg} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-brand-600 font-admin font-bold text-2xl">{initial}</span>
        )}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center
            opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer rounded-2xl"
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera size={18} className="text-white drop-shadow" />
          )}
        </div>
      </div>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-500 rounded-full
          flex items-center justify-center border-2 border-white shadow-md
          hover:bg-brand-600 hover:scale-105 transition-all duration-200"
        title="Change photo"
      >
        <Camera size={12} className="text-white" />
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ─── ENHANCED STAT CARD ────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, color, loading }) {
  return (
    <div className="group bg-white rounded-2xl border border-admin-100 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color} transition-transform duration-200 group-hover:scale-105`}>
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <div className="overflow-hidden">
        {loading ? (
          <div className="space-y-2">
            <div className="h-7 w-16 bg-admin-100 animate-pulse rounded-lg" />
            <div className="h-4 w-20 bg-admin-100 animate-pulse rounded-md" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-admin font-bold text-admin-900 tracking-tight">{value ?? '—'}</p>
            <p className="text-sm font-admin text-admin-400">{label}</p>
          </>
        )}
      </div>
    </div>
  )
}

// ─── ORDER CARD (COMPACT & POLISHED) ───────────────────────────────────────────
function OrderCard({ order, onComplete }) {
  const [completing, setCompleting] = useState(false)

  const customer = order.userId || order.guestId
  const isActive = order.status === 'out_for_delivery'

  const handleComplete = async () => {
    setCompleting(true)
    try {
      await driverService.completeDelivery(order._id)
      toast.success('Delivery marked as completed')
      onComplete(order._id)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete delivery')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="group bg-white rounded-2xl border border-admin-100 shadow-sm hover:shadow-md transition-all duration-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-admin font-bold text-admin-900 tracking-tight">{order.orderRef}</p>
          <p className="text-xs font-admin text-admin-400 mt-0.5">{formatDate(order.createdAt)}</p>
        </div>
        <span
          className={`text-xs font-admin font-semibold px-3 py-1.5 rounded-full border capitalize ${
            isActive
              ? 'bg-brand-50 text-brand-700 border-brand-200'
              : 'bg-purple-50 text-purple-700 border-purple-200'
          }`}
        >
          {order.status.replace('_', ' ')}
        </span>
      </div>

      {/* Customer */}
      {customer && (
        <div className="flex items-center gap-2.5 text-admin-700">
          <Phone size={14} className="text-admin-400 flex-shrink-0" />
          <span className="text-sm font-admin font-medium">{customer.name}</span>
          <a
            href={`tel:${customer.phone}`}
            className="text-xs font-admin text-brand-600 font-semibold hover:text-brand-700 transition-colors ml-auto"
          >
            {customer.phone}
          </a>
        </div>
      )}

      {/* Address */}
      {order.deliveryAddress && (
        <div className="flex items-start gap-2.5">
          <MapPin size={14} className="text-admin-400 mt-0.5 flex-shrink-0" />
          <span className="text-sm font-admin text-admin-700 leading-relaxed">{order.deliveryAddress}</span>
        </div>
      )}

      {/* Items summary */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-gradient-to-r from-admin-50 to-admin-100/50 rounded-xl border border-admin-100">
        <Package size={14} className="text-admin-500" />
        <span className="text-xs font-admin text-admin-700">
          {order.orderItems?.length || 0} item{order.orderItems?.length !== 1 ? 's' : ''} ·{' '}
          <span className="font-bold text-admin-900">{formatKES(order.total)}</span>
        </span>
      </div>

      {/* Complete button */}
      {isActive && (
        <button
          onClick={handleComplete}
          disabled={completing}
          className="w-full py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-sm font-admin
            font-semibold hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all
            duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow"
        >
          {completing ? (
            <>
              <Spinner size="sm" className="!w-4 !h-4" />
              <span>Marking…</span>
            </>
          ) : (
            <>
              <CheckCircle size={16} />
              <span>Mark as Delivered</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}

// ─── LOADING SKELETON FOR ORDERS ───────────────────────────────────────────────
function OrderSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-admin-100 shadow-sm p-5 space-y-4 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-1.5">
          <div className="h-5 w-24 bg-admin-100 rounded-md" />
          <div className="h-3 w-16 bg-admin-100 rounded-md" />
        </div>
        <div className="h-6 w-20 bg-admin-100 rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 bg-admin-100 rounded-full" />
        <div className="h-4 w-32 bg-admin-100 rounded-md" />
        <div className="h-4 w-20 bg-admin-100 rounded-md ml-auto" />
      </div>
      <div className="flex gap-2">
        <div className="h-4 w-4 bg-admin-100 rounded-full mt-0.5" />
        <div className="h-4 w-full bg-admin-100 rounded-md" />
      </div>
      <div className="h-10 bg-admin-100 rounded-xl" />
    </div>
  )
}

// ─── MAIN DASHBOARD (PREMIUM POLISH) ───────────────────────────────────────────
export default function DriverDashboardPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [activeOrders, setActiveOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [meRes, ordersRes] = await Promise.all([
        driverService.getMe(),
        driverService.getMyOrders({ status: 'out_for_delivery' })
      ])
      setProfile(meRes.data.data)
      setActiveOrders(ordersRes.data.data || [])
    } catch {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleToggleAvailability = async () => {
    if (!profile) return
    setToggling(true)
    try {
      const newVal = !profile.isAvailableForDelivery
      await driverService.setAvailability(newVal)
      setProfile((p) => ({ ...p, isAvailableForDelivery: newVal }))
      toast.success(newVal ? 'You are now available for deliveries' : 'You are now unavailable')
    } catch {
      toast.error('Failed to update availability')
    } finally {
      setToggling(false)
    }
  }

  const handleComplete = (orderId) => {
    setActiveOrders((o) => o.filter((x) => x._id !== orderId))
    setProfile((p) =>
      p ? { ...p, stats: { ...p.stats, active: (p.stats?.active || 1) - 1 } } : p
    )
  }

  const stats = profile?.stats || {}
  const isLoadingStats = loading && !profile

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Welcome + availability toggle */}
      <div className="bg-white rounded-3xl border border-admin-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-brand-50/50 via-white to-white p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <AvatarUploader
                avatarURL={profile?.avatarURL}
                name={profile?.name}
                onUpload={(url) => setProfile((p) => ({ ...p, avatarURL: url }))}
              />
              <div>
                {loading && !profile ? (
                  <div className="space-y-2">
                    <div className="h-7 w-36 bg-admin-100 animate-pulse rounded-lg" />
                    <div className="h-4 w-28 bg-admin-100 animate-pulse rounded-md" />
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl sm:text-3xl font-admin font-bold text-admin-900 tracking-tight">
                      Hey, {profile?.name?.split(' ')[0]} 👋
                    </h1>
                    <p className="text-sm font-admin text-admin-500 mt-1 flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 ring-2 ring-green-100" />
                      {profile?.vehicleInfo?.type && profile?.vehicleInfo?.plate
                        ? `${profile.vehicleInfo.type} · ${profile.vehicleInfo.plate}`
                        : 'Driver'}
                    </p>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handleToggleAvailability}
              disabled={toggling || loading}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border text-sm font-admin
                font-semibold transition-all duration-200 shadow-sm hover:shadow ${
                  toggling || loading ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  profile?.isAvailableForDelivery
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700 hover:from-green-100 hover:to-emerald-100'
                    : 'bg-gradient-to-r from-admin-50 to-slate-50 border-admin-200 text-admin-600 hover:from-admin-100 hover:to-slate-100'
                }`}
            >
              {profile?.isAvailableForDelivery ? (
                <>
                  <ToggleRight size={20} className="text-green-600" />
                  <span>Available for orders</span>
                </>
              ) : (
                <>
                  <ToggleLeft size={20} className="text-admin-500" />
                  <span>Unavailable</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          icon={Clock}
          value={stats.active}
          label="Active Deliveries"
          color="bg-brand-50 text-brand-600"
          loading={isLoadingStats}
        />
        <StatCard
          icon={CheckCircle}
          value={stats.completedToday}
          label="Completed Today"
          color="bg-green-50 text-green-600"
          loading={isLoadingStats}
        />
        <StatCard
          icon={Truck}
          value={stats.totalCompleted}
          label="Total Completed"
          color="bg-purple-50 text-purple-600"
          loading={isLoadingStats}
        />
      </div>

      {/* Active orders section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-admin font-bold text-admin-800 text-lg flex items-center gap-2">
            Active Deliveries
            {!loading && activeOrders.length > 0 && (
              <span className="text-xs font-normal bg-admin-100 text-admin-600 px-2 py-0.5 rounded-full">
                {activeOrders.length}
              </span>
            )}
          </h2>
          <Link
            to="/driver/orders"
            className="text-sm font-admin text-brand-600 hover:text-brand-700 font-medium transition-colors flex items-center gap-1 group"
          >
            All orders
            <span className="transform transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <OrderSkeleton />
            <OrderSkeleton />
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-admin-100 shadow-sm p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center">
              <Truck size={36} className="text-brand-400" />
            </div>
            <h3 className="font-admin font-bold text-admin-800 text-lg mb-1">No active deliveries</h3>
            <p className="text-sm font-admin text-admin-500 max-w-xs mx-auto">
              You're all caught up! When a new order is assigned, it will appear here.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-xs text-admin-400 bg-admin-50 px-4 py-2 rounded-full">
              <AlertCircle size={14} />
              <span>Make sure you're available to receive orders</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeOrders.map((o) => (
              <OrderCard key={o._id} order={o} onComplete={handleComplete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}