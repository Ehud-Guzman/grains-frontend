import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  User, Phone, Mail, MapPin, Plus, Trash2,
  Save, Lock, Edit2, CheckCircle, Package, ArrowLeft, Camera, Star
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useOnboarding } from '../../context/OnboardingContext'
import { useShopInfo } from '../../context/AppSettingsContext'
import { authService } from '../../services/auth.service'
import { formatDate } from '../../utils/helpers'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

// ── FIELD ─────────────────────────────────────────────────────────────────────
const Field = ({ label, icon: Icon, error, children }) => (
  <div>
    <label className="flex items-center gap-1.5 text-xs font-body font-semibold
      text-earth-700 uppercase tracking-wide mb-1.5">
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
    className={`w-full border rounded-xl px-4 py-2.5 text-sm font-body text-earth-800
      placeholder-earth-400 focus:outline-none focus:ring-2 focus:border-transparent
      transition-all bg-earth-50 ${
        error
          ? 'border-red-300 focus:ring-red-300'
          : 'border-earth-200 focus:ring-brand-400'
      } ${props.className || ''}`}
  />
)

// ── AVATAR UPLOADER ───────────────────────────────────────────────────────────
function AvatarUploader({ avatarURL, name, onUpload, size = 'md' }) {
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
  const dim = size === 'lg' ? 'w-20 h-20' : 'w-16 h-16'
  const textSize = size === 'lg' ? 'text-3xl' : 'text-2xl'
  const badgePos = size === 'lg' ? 'bottom-0 right-0' : '-bottom-0.5 -right-0.5'

  return (
    <div className="relative group flex-shrink-0">
      <div className={`${dim} rounded-2xl overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900
        flex items-center justify-center relative border-2 border-brand-600/30`}>
        {displayImg ? (
          <img src={displayImg} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className={`text-brand-300 font-display font-bold ${textSize}`}>{initial}</span>
        )}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center
          opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          onClick={() => fileRef.current?.click()}>
          {uploading
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Camera size={20} className="text-white" />
          }
        </div>
      </div>
      <button onClick={() => fileRef.current?.click()} disabled={uploading}
        className={`absolute ${badgePos} w-6 h-6 bg-brand-500 rounded-full flex items-center
          justify-center border-2 border-white hover:bg-brand-600 transition-colors shadow-sm`}>
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
    <div className={`relative rounded-xl border p-3.5 transition-all ${
      address.isDefault ? 'border-brand-200 bg-brand-50/60' : 'border-earth-200 bg-white hover:border-earth-300'
    }`}>
      {address.isDefault && (
        <span className="absolute top-2.5 right-2.5 text-xs font-body font-semibold
          text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Star size={9} fill="currentColor" /> Default
        </span>
      )}
      <div className="flex items-start gap-2.5 pr-14">
        <MapPin size={13} className="text-earth-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-body font-semibold text-earth-800">{address.label}</p>
          <p className="text-earth-500 text-xs mt-0.5 font-body leading-relaxed">{address.value}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-earth-100">
        {!address.isDefault && (
          <button onClick={onSetDefault}
            className="text-xs text-brand-600 hover:text-brand-700 font-body font-medium transition-colors">
            Set as default
          </button>
        )}
        <button onClick={onRemove}
          className="text-xs text-red-500 hover:text-red-700 font-body ml-auto transition-colors flex items-center gap-1">
          <Trash2 size={11} /> Remove
        </button>
      </div>
    </div>
  )
}

// ── SECTION HEADER ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, iconBg = 'bg-brand-50', iconColor = 'text-brand-600', action }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-earth-50">
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 ${iconBg} rounded-lg flex items-center justify-center`}>
          <Icon size={13} className={iconColor} />
        </div>
        <h2 className="font-body font-bold text-earth-900 text-sm">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export default function CustomerProfilePage() {
  const { user, updateUser } = useAuth()
  const { markMilestone, markChecklistItem } = useOnboarding()
  const shopInfo = useShopInfo()
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
      await authService.updateProfile({ name: form.name.trim(), email: form.email.trim() || null, addresses })
      updateUser({ name: form.name.trim(), email: form.email.trim() || null })
      markChecklistItem('customer', 'profile')
      markMilestone('customer-profile-complete')
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
    if (!newAddress.label.trim() || !newAddress.value.trim())
      return toast.error('Label and address are required')
    const updated = [...addresses, {
      label: newAddress.label.trim(),
      value: newAddress.value.trim(),
      isDefault: addresses.length === 0
    }]
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

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-earth-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link to="/dashboard"
            className="inline-flex items-center gap-1.5 text-earth-500 hover:text-earth-800
              text-xs font-body transition-colors">
            <ArrowLeft size={14} /> Orders
          </Link>
          <span className="font-body font-bold text-earth-900 text-sm">My Profile</span>
          <div className="w-16" />
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-5 grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4 items-start">

        {/* ══ LEFT SIDEBAR ═════════════════════════════════════════════ */}
        <div className="sm:sticky sm:top-[49px] space-y-3">

          {/* Identity card */}
          <div className="bg-white rounded-2xl border border-earth-100 shadow-warm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-brand-600 to-brand-800" />
            <div className="p-5 flex flex-col items-center text-center">
              <AvatarUploader
                avatarURL={profile?.avatarURL}
                name={profile?.name}
                onUpload={handleAvatarUpload}
                size="lg"
              />

              <h2 className="font-display font-bold text-earth-900 text-lg mt-3 leading-tight">
                {profile?.name}
              </h2>

              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-earth-500 text-xs font-body">{profile?.phone}</span>
                <span className="flex items-center gap-0.5 text-xs text-green-600 font-body font-semibold
                  bg-green-50 px-1.5 py-0.5 rounded-full">
                  <CheckCircle size={9} /> Verified
                </span>
              </div>

              {profile?.email && (
                <p className="text-earth-400 text-xs font-body mt-0.5 truncate max-w-full">
                  {profile.email}
                </p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 w-full mt-4">
                <div className="bg-earth-50 rounded-xl py-2.5 px-2 text-center">
                  <p className="font-display font-bold text-earth-900 text-xl leading-none">
                    {profile?.orderCount ?? '0'}
                  </p>
                  <p className="text-earth-500 text-xs font-body mt-0.5">Orders</p>
                </div>
                <div className="bg-earth-50 rounded-xl py-2.5 px-2 text-center">
                  <p className="font-display font-bold text-earth-900 text-xl leading-none">
                    {profile?.createdAt ? new Date(profile.createdAt).getFullYear() : '—'}
                  </p>
                  <p className="text-earth-500 text-xs font-body mt-0.5">Since</p>
                </div>
              </div>
            </div>

            {/* Nav links */}
            <div className="border-t border-earth-100 divide-y divide-earth-50">
              <Link to="/dashboard"
                className="flex items-center gap-2.5 px-4 py-3 text-sm font-body text-earth-700
                  hover:bg-earth-50 transition-colors">
                <Package size={14} className="text-earth-400" />
                My Orders
              </Link>
              <Link to="/shop"
                className="flex items-center gap-2.5 px-4 py-3 text-sm font-body text-earth-700
                  hover:bg-earth-50 transition-colors">
                <svg className="w-3.5 h-3.5 text-earth-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Browse Shop
              </Link>
            </div>

            {/* Contact */}
            <div className="border-t border-earth-100 px-4 py-3 bg-earth-50/50">
              <p className="text-xs text-earth-400 font-body mb-0.5">Need help?</p>
              <a href={`tel:${shopInfo.phone}`}
                className="text-xs font-body font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                {shopInfo.phone}
              </a>
            </div>
          </div>
        </div>

        {/* ══ RIGHT MAIN ═══════════════════════════════════════════════ */}
        <div className="space-y-4">

          {/* ── Personal Info ───────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-earth-100 shadow-warm overflow-hidden">
            <SectionHeader
              icon={User}
              title="Personal Information"
              action={
                !editing ? (
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700
                      font-body font-semibold transition-colors px-2.5 py-1.5 rounded-lg hover:bg-brand-50">
                    <Edit2 size={12} /> Edit
                  </button>
                ) : (
                  <button onClick={() => { setEditing(false); setErrors({}) }}
                    className="text-xs text-earth-400 hover:text-earth-600 font-body transition-colors px-2.5 py-1.5">
                    Cancel
                  </button>
                )
              }
            />

            <div className="p-5">
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
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSave} disabled={saving}
                      className="flex items-center gap-2 px-4 py-2.5 bg-brand-700 text-white rounded-xl
                        text-sm font-body font-semibold hover:bg-brand-800 transition-all
                        disabled:opacity-60 active:scale-[0.98]">
                      {saving
                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                        : <><Save size={14} /> Save Changes</>
                      }
                    </button>
                    <button onClick={() => { setEditing(false); setErrors({}) }}
                      className="px-4 py-2.5 border border-earth-200 text-earth-600 rounded-xl
                        text-sm font-body hover:bg-earth-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-earth-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User size={13} className="text-earth-400" />
                    </div>
                    <div>
                      <p className="text-xs text-earth-400 font-body uppercase tracking-wide">Full Name</p>
                      <p className="text-sm font-body font-semibold text-earth-800 mt-0.5">{profile?.name}</p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-earth-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone size={13} className="text-earth-400" />
                    </div>
                    <div>
                      <p className="text-xs text-earth-400 font-body uppercase tracking-wide">Phone</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-sm font-body font-semibold text-earth-800">{profile?.phone}</p>
                        <span className="text-xs text-green-600 font-body bg-green-50 px-1.5 py-px rounded-full flex items-center gap-0.5">
                          <CheckCircle size={9} /> Verified
                        </span>
                      </div>
                      <p className="text-xs text-earth-400 font-body mt-0.5">Contact us to change</p>
                    </div>
                  </div>

                  {/* Email — full width */}
                  <div className="flex items-start gap-3 sm:col-span-2">
                    <div className="w-8 h-8 bg-earth-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail size={13} className="text-earth-400" />
                    </div>
                    <div>
                      <p className="text-xs text-earth-400 font-body uppercase tracking-wide">Email Address</p>
                      {profile?.email ? (
                        <p className="text-sm font-body font-semibold text-earth-800 mt-0.5">{profile.email}</p>
                      ) : (
                        <button onClick={() => setEditing(true)}
                          className="text-sm font-body text-brand-600 hover:text-brand-700 mt-0.5
                            flex items-center gap-1 transition-colors">
                          <Plus size={13} /> Add email address
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Delivery Addresses ──────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-earth-100 shadow-warm overflow-hidden">
            <SectionHeader
              icon={MapPin}
              title={`Delivery Addresses${addresses.length > 0 ? ` (${addresses.length})` : ''}`}
              iconBg="bg-amber-50"
              iconColor="text-amber-500"
              action={
                !showAddAddress && (
                  <button onClick={() => setShowAddAddress(true)}
                    className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700
                      font-body font-semibold px-2.5 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                    <Plus size={12} /> Add
                  </button>
                )
              }
            />

            <div className="p-4 space-y-2.5">
              {addresses.length === 0 && !showAddAddress && (
                <div className="text-center py-7">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-2.5">
                    <MapPin size={18} className="text-amber-400" />
                  </div>
                  <p className="text-earth-700 text-sm font-body font-semibold">No saved addresses</p>
                  <p className="text-earth-400 text-xs font-body mt-1 mb-3">Save addresses to speed up checkout</p>
                  <button onClick={() => setShowAddAddress(true)}
                    className="inline-flex items-center gap-1.5 text-sm text-brand-600 font-body
                      font-semibold hover:text-brand-700 bg-brand-50 px-4 py-2 rounded-xl transition-colors">
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
                <div className="border-2 border-dashed border-brand-200 rounded-xl p-4 bg-brand-50/20 space-y-3">
                  <p className="text-xs font-body font-semibold text-brand-700 uppercase tracking-wide">
                    New Address
                  </p>
                  <Input placeholder="Label (e.g. Home, Office)"
                    value={newAddress.label}
                    onChange={e => setNewAddress(a => ({ ...a, label: e.target.value }))} />
                  <textarea rows={2} placeholder="Full address — building, street, town…"
                    value={newAddress.value}
                    onChange={e => setNewAddress(a => ({ ...a, value: e.target.value }))}
                    className="w-full border border-earth-200 rounded-xl px-4 py-2.5 text-sm font-body
                      text-earth-800 placeholder-earth-400 focus:outline-none focus:ring-2
                      focus:ring-brand-400 focus:border-transparent bg-earth-50 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={addAddress}
                      className="flex-1 py-2.5 bg-brand-700 text-white rounded-xl text-sm
                        font-body font-semibold hover:bg-brand-800 transition-colors">
                      Save Address
                    </button>
                    <button onClick={() => { setShowAddAddress(false); setNewAddress({ label: '', value: '' }) }}
                      className="flex-1 py-2.5 border border-earth-200 text-earth-600 rounded-xl
                        text-sm font-body hover:bg-earth-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Security ──────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-earth-100 shadow-warm overflow-hidden">
            <SectionHeader
              icon={Lock}
              title="Password & Security"
              iconBg="bg-slate-100"
              iconColor="text-slate-500"
            />
            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-body text-earth-700">Change your account password</p>
                <p className="text-xs text-earth-400 font-body mt-0.5">
                  Last changed: {profile?.passwordChangedAt ? formatDate(profile.passwordChangedAt) : 'Never'}
                </p>
              </div>
              <Link to="/login"
                className="text-xs text-brand-600 hover:text-brand-700 font-body font-semibold
                  px-3 py-2 rounded-xl border border-brand-100 hover:bg-brand-50 transition-colors flex-shrink-0">
                Change →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
