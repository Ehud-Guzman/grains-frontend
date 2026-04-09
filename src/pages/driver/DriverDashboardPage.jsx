import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Truck, CheckCircle, Clock, ToggleLeft, ToggleRight, MapPin, Phone, Package, Camera } from 'lucide-react'
import { driverService } from '../../services/driver.service'
import { authService } from '../../services/auth.service'
import { useAuth } from '../../context/AuthContext'
import { formatKES, formatDate } from '../../utils/helpers'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

// ── AVATAR UPLOADER ───────────────────────────────────────────────────────────
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
      <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-admin-100
        bg-brand-50 flex items-center justify-center relative shadow-sm">
        {displayImg
          ? <img src={displayImg} alt={name} className="w-full h-full object-cover" />
          : <span className="text-brand-500 font-admin font-bold text-2xl">{initial}</span>
        }
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center
          opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl"
          onClick={() => fileRef.current?.click()}>
          {uploading
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Camera size={18} className="text-white" />
          }
        </div>
      </div>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-500 rounded-full
          flex items-center justify-center border-2 border-white
          hover:bg-brand-600 transition-colors shadow-sm"
        title="Change photo"
      >
        <Camera size={10} className="text-white" />
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div className="bg-white rounded-2xl border border-admin-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-admin font-bold text-admin-900">{value ?? '—'}</p>
        <p className="text-sm font-admin text-admin-400">{label}</p>
      </div>
    </div>
  )
}

// ── ORDER CARD (compact) ──────────────────────────────────────────────────────
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
    } finally { setCompleting(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-admin-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-admin font-bold text-admin-900">{order.orderRef}</p>
          <p className="text-xs font-admin text-admin-400">{formatDate(order.createdAt)}</p>
        </div>
        <span className={`text-xs font-admin font-semibold px-2.5 py-1 rounded-full border capitalize
          ${isActive
            ? 'bg-brand-50 text-brand-700 border-brand-200'
            : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
          {order.status.replace('_', ' ')}
        </span>
      </div>

      {/* Customer */}
      {customer && (
        <div className="flex items-center gap-2">
          <Phone size={13} className="text-admin-400" />
          <span className="text-sm font-admin text-admin-700">{customer.name}</span>
          <a href={`tel:${customer.phone}`} className="text-xs font-admin text-brand-600 font-medium">
            {customer.phone}
          </a>
        </div>
      )}

      {/* Address */}
      {order.deliveryAddress && (
        <div className="flex items-start gap-2">
          <MapPin size={13} className="text-admin-400 mt-0.5 flex-shrink-0" />
          <span className="text-sm font-admin text-admin-700">{order.deliveryAddress}</span>
        </div>
      )}

      {/* Items summary */}
      <div className="flex items-center gap-2 px-3 py-2 bg-admin-50 rounded-xl">
        <Package size={13} className="text-admin-400" />
        <span className="text-xs font-admin text-admin-600">
          {order.orderItems?.length || 0} item{order.orderItems?.length !== 1 ? 's' : ''} ·{' '}
          <span className="font-semibold text-admin-800">{formatKES(order.total)}</span>
        </span>
      </div>

      {/* Complete button */}
      {isActive && (
        <button
          onClick={handleComplete}
          disabled={completing}
          className="w-full py-2.5 bg-green-500 text-white rounded-xl text-sm font-admin
            font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center
            justify-center gap-2">
          <CheckCircle size={15} />
          {completing ? 'Marking…' : 'Mark as Delivered'}
        </button>
      )}
    </div>
  )
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
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
    } catch { toast.error('Failed to load dashboard') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleToggleAvailability = async () => {
    if (!profile) return
    setToggling(true)
    try {
      const newVal = !profile.isAvailableForDelivery
      await driverService.setAvailability(newVal)
      setProfile(p => ({ ...p, isAvailableForDelivery: newVal }))
      toast.success(newVal ? 'You are now available for deliveries' : 'You are now unavailable')
    } catch { toast.error('Failed to update availability') }
    finally { setToggling(false) }
  }

  const handleComplete = (orderId) => {
    setActiveOrders(o => o.filter(x => x._id !== orderId))
    setProfile(p => p ? { ...p, stats: { ...p.stats, active: (p.stats?.active || 1) - 1 } } : p)
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const stats = profile?.stats || {}

  return (
    <div className="space-y-6">

      {/* Welcome + availability toggle */}
      <div className="bg-white rounded-2xl border border-admin-100 shadow-sm p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <AvatarUploader
              avatarURL={profile?.avatarURL}
              name={profile?.name}
              onUpload={(url) => setProfile(p => ({ ...p, avatarURL: url }))}
            />
            <div>
              <h1 className="text-xl font-admin font-bold text-admin-900">
                Hey, {profile?.name?.split(' ')[0]} 👋
              </h1>
              <p className="text-sm font-admin text-admin-400 mt-0.5">
                {profile?.vehicleInfo?.type && profile?.vehicleInfo?.plate
                  ? `${profile.vehicleInfo.type} · ${profile.vehicleInfo.plate}`
                  : 'Driver'
                }
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleAvailability}
            disabled={toggling}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-admin
              font-semibold transition-all ${toggling ? 'opacity-50 cursor-not-allowed' : ''}
              ${profile?.isAvailableForDelivery
                ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                : 'bg-admin-50 border-admin-200 text-admin-500 hover:bg-admin-100'}`}>
            {profile?.isAvailableForDelivery
              ? <><ToggleRight size={18} /> Available</>
              : <><ToggleLeft size={18} /> Unavailable</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Clock}        value={stats.active}        label="Active Deliveries"  color="bg-brand-50 text-brand-600" />
        <StatCard icon={CheckCircle}  value={stats.completedToday} label="Completed Today"   color="bg-green-50 text-green-600" />
        <StatCard icon={Truck}        value={stats.totalCompleted} label="Total Completed"   color="bg-purple-50 text-purple-600" />
      </div>

      {/* Active orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-admin font-bold text-admin-800 text-base">Active Deliveries</h2>
          <Link to="/driver/orders" className="text-sm font-admin text-brand-600 hover:text-brand-700 font-medium">
            All orders →
          </Link>
        </div>

        {activeOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-admin-100 shadow-sm p-10 text-center">
            <Truck size={32} className="text-admin-200 mx-auto mb-3" />
            <p className="font-admin font-semibold text-admin-500">No active deliveries</p>
            <p className="text-sm font-admin text-admin-400 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeOrders.map(o => (
              <OrderCard key={o._id} order={o} onComplete={handleComplete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
