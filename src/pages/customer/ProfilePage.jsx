import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  User, Phone, Mail, MapPin, Plus, Trash2,
  Save, Lock, Edit2, CheckCircle, Package, ArrowLeft, Camera
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/auth.service'
import { formatDate, isValidKenyanPhone } from '../../utils/helpers'
import { SHOP_INFO } from '../../utils/constants'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

// ── FIELD ─────────────────────────────────────────────────────────────────────
const Field = ({ label, icon: Icon, error, children }) => (
  <div>
    <label className="flex items-center gap-1.5 text-xs font-body font-semibold
      text-earth-600 uppercase tracking-wide mb-1.5">
      {Icon && <Icon size={11} />}
      {label}
    </label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1 font-body">{error}</p>}
  </div>
)

const Input = ({ error, ...props }) => (
  <input
    {...props}
    className={`w-full border rounded-xl px-4 py-3 text-sm font-body text-earth-800
      placeholder-earth-400 focus:outline-none focus:ring-2 focus:border-transparent
      transition-all bg-earth-50 ${
        error
          ? 'border-red-300 focus:ring-red-300'
          : 'border-earth-200 focus:ring-brand-400'
      } ${props.className || ''}`}
  />
)

// ── AVATAR UPLOADER ───────────────────────────────────────────────────────────
function AvatarUploader({ avatarURL, name, onUpload }) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef()

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview immediately
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
      <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/20
        bg-brand-500/20 flex items-center justify-center relative shadow-warm">
        {displayImg ? (
          <img src={displayImg} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-brand-400 font-display font-bold text-2xl">{initial}</span>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center
          opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl"
          onClick={() => fileRef.current?.click()}>
          {uploading
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Camera size={18} className="text-white" />
          }
        </div>
      </div>

      {/* Camera badge */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-500 rounded-full
          flex items-center justify-center border-2 border-earth-900
          hover:bg-brand-600 transition-colors shadow-sm"
        title="Change photo"
      >
        <Camera size={11} className="text-white" />
      </button>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
        className="hidden" onChange={handleFile} />
    </div>
  )
}

// ── ADDRESS CARD ──────────────────────────────────────────────────────────────
function AddressCard({ address, onRemove, onSetDefault }) {
  return (
    <div className={`relative rounded-xl border p-4 transition-all ${
      address.isDefault
        ? 'border-brand-300 bg-brand-50'
        : 'border-earth-200 bg-white hover:border-earth-300'
    }`}>
      {address.isDefault && (
        <span className="absolute top-3 right-3 text-xs font-body font-semibold
          text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
          Default
        </span>
      )}
      <div className="flex items-start gap-2.5 pr-16">
        <MapPin size={14} className="text-earth-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-body font-semibold text-earth-800">{address.label}</p>
          <p className="text-earth-500 text-xs mt-0.5 font-body leading-relaxed">{address.value}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-earth-100">
        {!address.isDefault && (
          <button onClick={onSetDefault}
            className="text-xs text-brand-600 hover:text-brand-700 font-body font-medium transition-colors">
            Set as default
          </button>
        )}
        <button onClick={onRemove}
          className="text-xs text-red-500 hover:text-red-700 font-body ml-auto transition-colors
            flex items-center gap-1">
          <Trash2 size={11} /> Remove
        </button>
      </div>
    </div>
  )
}

export default function CustomerProfilePage() {
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({ name: '', email: '' })
  const [addresses, setAddresses] = useState([])
  const [newAddress, setNewAddress] = useState({ label: '', value: '' })
  const [showAddAddress, setShowAddAddress] = useState(false)

  useEffect(() => {
    authService.getProfile()
      .then(res => {
        const p = res.data.data
        setProfile(p)
        setForm({ name: p.name || '', email: p.email || '' })
        setAddresses(p.addresses || [])
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email address'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      await authService.updateProfile({
        name: form.name.trim(),
        email: form.email.trim() || null,
        addresses
      })
      updateUser({ name: form.name.trim(), email: form.email.trim() || null })
      toast.success('Profile updated')
      setEditing(false)
      const res = await authService.getProfile()
      setProfile(res.data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleAvatarUpload = (url) => {
    setProfile(p => ({ ...p, avatarURL: url }))
    updateUser({ avatarURL: url })
  }

  const addAddress = async () => {
    if (!newAddress.label.trim() || !newAddress.value.trim()) {
      return toast.error('Label and address are required')
    }
    const updated = [
      ...addresses,
      { label: newAddress.label.trim(), value: newAddress.value.trim(), isDefault: addresses.length === 0 }
    ]
    setAddresses(updated)
    setNewAddress({ label: '', value: '' })
    setShowAddAddress(false)
    try {
      await authService.updateProfile({ addresses: updated })
      toast.success('Address saved')
    } catch { toast.error('Failed to save address') }
  }

  const removeAddress = async (i) => {
    const updated = addresses.filter((_, j) => j !== i)
    if (addresses[i].isDefault && updated.length > 0) updated[0].isDefault = true
    setAddresses(updated)
    try {
      await authService.updateProfile({ addresses: updated })
      toast.success('Address removed')
    } catch { toast.error('Failed to remove address') }
  }

  const setDefault = async (i) => {
    const updated = addresses.map((a, j) => ({ ...a, isDefault: j === i }))
    setAddresses(updated)
    try {
      await authService.updateProfile({ addresses: updated })
      toast.success('Default address updated')
    } catch { toast.error('Failed to update') }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="bg-earth-900 pt-8 pb-16 px-4">
        <div className="container-page max-w-2xl">
          <Link to="/dashboard"
            className="inline-flex items-center gap-1.5 text-earth-400 hover:text-cream
              text-sm font-body transition-colors mb-5">
            <ArrowLeft size={15} /> My Orders
          </Link>
          <div className="flex items-center gap-4">
            {/* Avatar with upload */}
            <AvatarUploader
              avatarURL={profile?.avatarURL}
              name={profile?.name}
              onUpload={handleAvatarUpload}
            />
            <div>
              <h1 className="font-display text-2xl font-bold text-cream">{profile?.name}</h1>
              <p className="text-earth-400 text-sm font-body mt-0.5">
                Customer since {formatDate(profile?.createdAt)}
              </p>
              <p className="text-earth-600 text-xs font-body mt-1">
                Tap photo to change
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page max-w-2xl -mt-8 pb-12 space-y-4">

        {/* ── Personal Info ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-earth-100 shadow-warm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-earth-50">
            <div className="flex items-center gap-2">
              <User size={15} className="text-earth-400" />
              <h2 className="font-body font-bold text-earth-900">Personal Information</h2>
            </div>
            {!editing ? (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700
                  font-body font-semibold transition-colors px-3 py-1.5 rounded-lg hover:bg-brand-50">
                <Edit2 size={13} /> Edit
              </button>
            ) : (
              <button onClick={() => { setEditing(false); setErrors({}) }}
                className="text-xs text-earth-500 hover:text-earth-700 font-body transition-colors">
                Cancel
              </button>
            )}
          </div>

          <div className="p-5 pt-6">
            {editing ? (
              <div className="space-y-4">
                <Field label="Full Name" icon={User} error={errors.name}>
                  <Input placeholder="Your full name" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    error={errors.name} autoFocus />
                </Field>
                <Field label="Email Address" icon={Mail} error={errors.email}>
                  <Input type="email" placeholder="your@email.com (optional)"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    error={errors.email} />
                </Field>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-3 bg-earth-900 text-white rounded-xl
                    text-sm font-body font-semibold hover:bg-earth-800 transition-all
                    disabled:opacity-60 active:scale-[0.98]">
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                  ) : (
                    <><Save size={15} /> Save Changes</>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {[
                  { icon: User,  label: 'Full Name',    value: profile?.name  },
                  { icon: Phone, label: 'Phone Number', value: profile?.phone,
                    note: 'To change your phone number, contact us' },
                  { icon: Mail,  label: 'Email',        value: profile?.email || 'Not set' },
                ].map(({ icon: Icon, label, value, note }) => (
                  <div key={label} className="flex items-start gap-3.5 py-1">
                    <div className="w-9 h-9 bg-earth-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon size={15} className="text-earth-400" />
                    </div>
                    <div className="pt-0.5">
                      <p className="text-xs text-earth-400 font-body uppercase tracking-wide mb-1">{label}</p>
                      <p className="text-sm font-body font-semibold text-earth-800">{value}</p>
                      {note && <p className="text-xs text-earth-400 font-body mt-0.5">{note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Delivery Addresses ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-earth-100 shadow-warm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-earth-50">
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-earth-400" />
              <h2 className="font-body font-bold text-earth-900">Delivery Addresses</h2>
              {addresses.length > 0 && (
                <span className="text-xs text-earth-400 font-body">({addresses.length})</span>
              )}
            </div>
            {!showAddAddress && (
              <button onClick={() => setShowAddAddress(true)}
                className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700
                  font-body font-semibold transition-colors px-3 py-1.5 rounded-lg hover:bg-brand-50">
                <Plus size={13} /> Add
              </button>
            )}
          </div>

          <div className="p-5 space-y-3">
            {addresses.length === 0 && !showAddAddress && (
              <div className="text-center py-6">
                <div className="w-10 h-10 bg-earth-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MapPin size={18} className="text-earth-300" />
                </div>
                <p className="text-earth-500 text-sm font-body font-medium">No addresses saved</p>
                <p className="text-earth-400 text-xs font-body mt-1 mb-4">
                  Save addresses to speed up checkout
                </p>
                <button onClick={() => setShowAddAddress(true)}
                  className="inline-flex items-center gap-1.5 text-sm text-brand-600 font-body
                    font-semibold hover:text-brand-700 transition-colors">
                  <Plus size={14} /> Add your first address
                </button>
              </div>
            )}

            {addresses.map((addr, i) => (
              <AddressCard key={i} address={addr}
                onRemove={() => removeAddress(i)}
                onSetDefault={() => setDefault(i)} />
            ))}

            {showAddAddress && (
              <div className="border-2 border-dashed border-brand-200 rounded-xl p-4 bg-brand-50/30 space-y-3">
                <p className="text-xs font-body font-semibold text-earth-600 uppercase tracking-wide">
                  New Address
                </p>
                <Input placeholder="Label (e.g. Home, Office, Warehouse)"
                  value={newAddress.label}
                  onChange={e => setNewAddress(a => ({ ...a, label: e.target.value }))} />
                <textarea rows={2}
                  placeholder="Full address — building, street, town…"
                  value={newAddress.value}
                  onChange={e => setNewAddress(a => ({ ...a, value: e.target.value }))}
                  className="w-full border border-earth-200 rounded-xl px-4 py-3 text-sm font-body
                    text-earth-800 placeholder-earth-400 focus:outline-none focus:ring-2
                    focus:ring-brand-400 focus:border-transparent bg-earth-50 resize-none" />
                <div className="flex gap-2">
                  <button onClick={addAddress}
                    className="flex-1 py-2.5 bg-earth-900 text-white rounded-xl text-sm
                      font-body font-semibold hover:bg-earth-800 transition-colors">
                    Save Address
                  </button>
                  <button onClick={() => { setShowAddAddress(false); setNewAddress({ label: '', value: '' }) }}
                    className="flex-1 py-2.5 border border-earth-200 text-earth-600 rounded-xl
                      text-sm font-body font-medium hover:bg-earth-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Security ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-earth-100 shadow-warm p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-earth-50 rounded-xl flex items-center justify-center">
                <Lock size={15} className="text-earth-500" />
              </div>
              <div>
                <p className="font-body font-bold text-earth-900 text-sm">Password</p>
                <p className="text-earth-400 text-xs font-body mt-0.5">Keep your account secure</p>
              </div>
            </div>
            <Link to="/login"
              className="text-xs text-brand-600 hover:text-brand-700 font-body font-semibold
                transition-colors px-3 py-1.5 rounded-lg hover:bg-brand-50">
              Change →
            </Link>
          </div>
        </div>

        {/* ── Quick links ───────────────────────────────────────────── */}
        <div className="flex gap-3">
          <Link to="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border
              border-earth-200 rounded-xl text-sm font-body font-medium text-earth-600
              hover:bg-earth-50 transition-colors">
            <Package size={15} /> My Orders
          </Link>
          <Link to="/shop"
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-earth-900
              text-cream rounded-xl text-sm font-body font-medium hover:bg-earth-800 transition-colors">
            Browse Shop
          </Link>
        </div>

        <p className="text-center text-xs text-earth-400 font-body">
          Need help? Call us at{' '}
          <a href={`tel:${SHOP_INFO.phone}`} className="text-brand-600 hover:underline font-semibold">
            {SHOP_INFO.phone}
          </a>
        </p>
      </div>
    </div>
  )
}