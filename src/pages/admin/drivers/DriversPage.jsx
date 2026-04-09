import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Lock, Unlock, Key, Truck, User,
  X, Eye, EyeOff, Phone, Car, ShoppingCart,
  CheckCircle, Clock, AlertCircle
} from 'lucide-react'
import { adminDriverService } from '../../../services/admin/driver.service'
import { formatDate } from '../../../utils/helpers'
import Spinner from '../../../components/ui/Spinner'
import toast from 'react-hot-toast'

// ── AVAILABILITY BADGE ────────────────────────────────────────────────────────
function AvailBadge({ available }) {
  return available
    ? <span className="inline-flex items-center gap-1 text-xs font-admin font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Available
      </span>
    : <span className="inline-flex items-center gap-1 text-xs font-admin font-semibold px-2.5 py-1 rounded-full bg-admin-50 text-admin-500 border border-admin-200">
        <span className="w-1.5 h-1.5 rounded-full bg-admin-300 inline-block" />Unavailable
      </span>
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function Modal({ modal, onClose, onSave }) {
  const [form, setForm] = useState(modal.form || {})
  const [saving, setSaving] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(form) }
    finally { setSaving(false) }
  }

  const fieldClass = `w-full border border-admin-200 rounded-xl px-3.5 py-2.5 text-sm
    font-admin text-admin-800 placeholder-admin-400 focus:outline-none focus:ring-2
    focus:ring-brand-400 focus:border-transparent bg-admin-50 transition-all`

  const titles = {
    create: 'Add Driver',
    password: `Reset Password — ${modal.driver?.name}`,
    vehicle: `Vehicle Info — ${modal.driver?.name}`,
    orders: `Orders — ${modal.driver?.name}`,
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl w-full shadow-admin-lg border border-admin-100
        ${modal.type === 'orders' ? 'max-w-2xl' : 'max-w-sm'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              {modal.type === 'create' ? <Truck size={15} className="text-brand-600" />
               : modal.type === 'password' ? <Key size={15} className="text-brand-600" />
               : modal.type === 'vehicle' ? <Car size={15} className="text-brand-600" />
               : <ShoppingCart size={15} className="text-brand-600" />}
            </div>
            <h3 className="font-admin font-bold text-admin-900 text-sm">{titles[modal.type]}</h3>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-admin-100 text-admin-400 hover:text-admin-600 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        {modal.type === 'orders' ? (
          <DriverOrdersList driverId={modal.driver._id} />
        ) : (
          <>
            <div className="p-5 space-y-4">
              {modal.type === 'create' && (
                <>
                  {[
                    { key: 'name',     label: 'Full Name',       type: 'text',  ph: 'John Driver'    },
                    { key: 'phone',    label: 'Phone Number',    type: 'tel',   ph: '0712 345 678'   },
                    { key: 'email',    label: 'Email (optional)',type: 'email', ph: 'john@driver.com' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-admin font-semibold text-admin-600 uppercase tracking-wide mb-1.5">
                        {f.label}
                      </label>
                      <input type={f.type} placeholder={f.ph} value={form[f.key] || ''}
                        onChange={e => set(f.key, e.target.value)} className={fieldClass} />
                    </div>
                  ))}

                  <div>
                    <label className="block text-xs font-admin font-semibold text-admin-600 uppercase tracking-wide mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} placeholder="Min 8 characters"
                        value={form.password || ''} onChange={e => set('password', e.target.value)}
                        className={fieldClass + ' pr-10'} />
                      <button type="button" onClick={() => setShowPass(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-400 hover:text-admin-600 p-0.5">
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-admin font-semibold text-admin-600 uppercase tracking-wide mb-1.5">
                        Vehicle Type
                      </label>
                      <select value={form.vehicleType || ''} onChange={e => set('vehicleType', e.target.value)}
                        className={fieldClass}>
                        <option value="">Select…</option>
                        {['Motorcycle', 'Pickup', 'Van', 'Truck', 'Other'].map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-admin font-semibold text-admin-600 uppercase tracking-wide mb-1.5">
                        Plate Number
                      </label>
                      <input type="text" placeholder="KCA 123A" value={form.vehiclePlate || ''}
                        onChange={e => set('vehiclePlate', e.target.value.toUpperCase())}
                        className={fieldClass} />
                    </div>
                  </div>
                </>
              )}

              {modal.type === 'password' && (
                <div>
                  <label className="block text-xs font-admin font-semibold text-admin-600 uppercase tracking-wide mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} placeholder="Min 8 characters"
                      value={form.password || ''} onChange={e => set('password', e.target.value)}
                      className={fieldClass + ' pr-10'} autoFocus />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-400 hover:text-admin-600 p-0.5">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              {modal.type === 'vehicle' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-admin font-semibold text-admin-600 uppercase tracking-wide mb-1.5">
                      Vehicle Type
                    </label>
                    <select value={form.vehicleType || ''} onChange={e => set('vehicleType', e.target.value)}
                      className={fieldClass}>
                      <option value="">Select…</option>
                      {['Motorcycle', 'Pickup', 'Van', 'Truck', 'Other'].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-admin font-semibold text-admin-600 uppercase tracking-wide mb-1.5">
                      Plate Number
                    </label>
                    <input type="text" placeholder="KCA 123A" value={form.vehiclePlate || ''}
                      onChange={e => set('vehiclePlate', e.target.value.toUpperCase())}
                      className={fieldClass} />
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 bg-brand-500 text-white rounded-xl text-sm font-admin
                  font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={onClose}
                className="flex-1 py-3 border border-admin-200 text-admin-600 rounded-xl
                  text-sm font-admin font-medium hover:bg-admin-50 transition-colors">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── DRIVER ORDERS SUB-LIST ─────────────────────────────────────────────────────
function DriverOrdersList({ driverId }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminDriverService.getOrders(driverId)
      .then(res => setOrders(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [driverId])

  const STATUS_COLORS = {
    out_for_delivery: 'text-brand-700 bg-brand-50 border-brand-200',
    completed:        'text-green-700 bg-green-50 border-green-200',
    preparing:        'text-purple-700 bg-purple-50 border-purple-200',
    cancelled:        'text-admin-500 bg-admin-50 border-admin-200',
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  return (
    <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2">
      {orders.length === 0
        ? <p className="text-center text-sm font-admin text-admin-400 py-6">No orders yet</p>
        : orders.map(o => (
          <div key={o._id} className="flex items-center justify-between p-3 rounded-xl border border-admin-100 bg-admin-50/40">
            <div>
              <p className="text-sm font-admin font-semibold text-admin-800">{o.orderRef}</p>
              <p className="text-xs font-admin text-admin-400 mt-0.5">{o.deliveryAddress || 'No address'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-admin font-semibold px-2 py-0.5 rounded-full border capitalize
                ${STATUS_COLORS[o.status] || 'text-admin-500 bg-admin-50 border-admin-200'}`}>
                {o.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        ))
      }
    </div>
  )
}

// ── DRIVER STATS PILLS ─────────────────────────────────────────────────────────
function StatPill({ icon: Icon, value, label, color }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${color}`}>
      <Icon size={13} />
      <span className="text-xs font-admin font-semibold">{value}</span>
      <span className="text-xs font-admin opacity-70">{label}</span>
    </div>
  )
}

// ── DRIVER CARD ───────────────────────────────────────────────────────────────
function DriverCard({ driver, onLock, onUnlock, onResetPassword, onViewOrders, onEditVehicle }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    adminDriverService.getStats(driver._id)
      .then(res => setStats(res.data.data))
      .catch(() => {})
  }, [driver._id])

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all
      ${driver.isLocked ? 'border-red-200 opacity-70' : 'border-admin-100'}`}>

      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
              <Truck size={18} className="text-brand-600" />
            </div>
            <div>
              <p className="font-admin font-bold text-admin-900 text-sm">{driver.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Phone size={11} className="text-admin-400" />
                <span className="text-xs font-admin text-admin-500">{driver.phone}</span>
              </div>
            </div>
          </div>
          <AvailBadge available={driver.isAvailableForDelivery} />
        </div>

        {/* Vehicle info */}
        {(driver.vehicleInfo?.type || driver.vehicleInfo?.plate) && (
          <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 bg-admin-50 rounded-lg">
            <Car size={12} className="text-admin-400" />
            <span className="text-xs font-admin text-admin-600">
              {[driver.vehicleInfo.type, driver.vehicleInfo.plate].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            <StatPill icon={ShoppingCart} value={stats.total} label="total" color="text-admin-600 bg-admin-50" />
            <StatPill icon={Clock} value={stats.active} label="active" color="text-brand-600 bg-brand-50" />
            <StatPill icon={CheckCircle} value={stats.completed} label="done" color="text-green-600 bg-green-50" />
          </div>
        )}

        {/* Locked badge */}
        {driver.isLocked && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 rounded-lg mb-3">
            <AlertCircle size={12} className="text-red-500" />
            <span className="text-xs font-admin font-semibold text-red-600">Account Locked</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-admin-50">
          <button onClick={() => onViewOrders(driver)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-admin font-medium
              text-admin-600 bg-admin-50 hover:bg-admin-100 rounded-lg transition-colors">
            <ShoppingCart size={12} /> Orders
          </button>
          <button onClick={() => onEditVehicle(driver)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-admin font-medium
              text-admin-600 bg-admin-50 hover:bg-admin-100 rounded-lg transition-colors">
            <Car size={12} /> Vehicle
          </button>
          <button onClick={() => onResetPassword(driver)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-admin font-medium
              text-admin-600 bg-admin-50 hover:bg-admin-100 rounded-lg transition-colors">
            <Key size={12} /> Password
          </button>
          {driver.isLocked
            ? <button onClick={() => onUnlock(driver._id)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-admin font-medium
                  text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                <Unlock size={12} /> Unlock
              </button>
            : <button onClick={() => onLock(driver._id)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-admin font-medium
                  text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                <Lock size={12} /> Lock
              </button>
          }
        </div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function DriversPage() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')

  const fetch = async () => {
    setLoading(true)
    try {
      const res = await adminDriverService.getAll({ search: search || undefined })
      setDrivers(res.data.data || [])
    } catch { toast.error('Failed to load drivers') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [search])

  const handleSave = async (form) => {
    try {
      if (modal.type === 'create') {
        await adminDriverService.create(form)
        toast.success('Driver account created')
      } else if (modal.type === 'password') {
        await adminDriverService.resetPassword(modal.driver._id, form.password)
        toast.success('Password reset')
      } else if (modal.type === 'vehicle') {
        await adminDriverService.updateVehicle(modal.driver._id, form)
        toast.success('Vehicle info updated')
      }
      setModal(null)
      fetch()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong')
      throw err
    }
  }

  const handleLock = async (id) => {
    try {
      await adminDriverService.lock(id)
      toast.success('Account locked')
      fetch()
    } catch { toast.error('Failed to lock account') }
  }

  const handleUnlock = async (id) => {
    try {
      await adminDriverService.unlock(id)
      toast.success('Account unlocked')
      fetch()
    } catch { toast.error('Failed to unlock account') }
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-admin font-bold text-admin-900">Drivers</h1>
          <p className="text-sm font-admin text-admin-400 mt-0.5">Manage delivery drivers for this branch</p>
        </div>
        <button
          onClick={() => setModal({ type: 'create', form: {} })}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl
            text-sm font-admin font-semibold hover:bg-brand-600 transition-colors shadow-sm">
          <Plus size={15} /> Add Driver
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-400" />
        <input
          type="text"
          placeholder="Search drivers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-admin-200 rounded-xl text-sm
            font-admin text-admin-800 focus:outline-none focus:ring-2 focus:ring-brand-400
            bg-white placeholder-admin-400"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-admin-100">
          <div className="w-14 h-14 bg-admin-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck size={24} className="text-admin-300" />
          </div>
          <p className="font-admin font-semibold text-admin-700">No drivers yet</p>
          <p className="text-sm font-admin text-admin-400 mt-1">Add your first driver to get started</p>
          <button
            onClick={() => setModal({ type: 'create', form: {} })}
            className="mt-4 px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-admin
              font-semibold hover:bg-brand-600 transition-colors">
            Add Driver
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map(d => (
            <DriverCard
              key={d._id}
              driver={d}
              onLock={handleLock}
              onUnlock={handleUnlock}
              onResetPassword={(driver) => setModal({ type: 'password', driver, form: {} })}
              onViewOrders={(driver) => setModal({ type: 'orders', driver })}
              onEditVehicle={(driver) => setModal({
                type: 'vehicle', driver,
                form: { vehicleType: driver.vehicleInfo?.type || '', vehiclePlate: driver.vehicleInfo?.plate || '' }
              })}
            />
          ))}
        </div>
      )}

      {modal && modal.type !== 'orders' && (
        <Modal modal={modal} onClose={() => setModal(null)} onSave={handleSave} />
      )}
      {modal && modal.type === 'orders' && (
        <Modal modal={modal} onClose={() => setModal(null)} onSave={() => {}} />
      )}
    </div>
  )
}
