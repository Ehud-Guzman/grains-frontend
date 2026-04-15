import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useAppSettings } from '../../../context/AppSettingsContext'
import { adminSettingsService } from '../../../services/admin/settings.service'
import { adminBranchService } from '../../../services/admin/branch.service'
import { OnboardingReturnLink } from '../../../components/onboarding/OnboardingEnhancements'
import {
  Store, ShoppingCart, Bell, Shield, Save, AlertTriangle,
  GitBranch, ChevronDown, Lock, Users, Package, Clock,
  Tag, UserCheck, MapPin, Plus, Trash2, Percent, Info,
} from 'lucide-react'
import Spinner from '../../../components/ui/Spinner'
import toast from 'react-hot-toast'

// ── NAV SECTIONS ──────────────────────────────────────────────────────────────
const NAV = [
  { id: 'shop',          icon: Store,        label: 'Shop Info'        },
  { id: 'tax',           icon: Percent,      label: 'Tax & Compliance' },
  { id: 'orders',        icon: ShoppingCart, label: 'Orders'           },
  { id: 'catalog',       icon: Tag,          label: 'Catalog'          },
  { id: 'customers',     icon: UserCheck,    label: 'Customers'        },
  { id: 'notifications', icon: Bell,         label: 'Notifications'    },
  { id: 'system',        icon: Shield,       label: 'System', superAdminOnly: true },
]

// ── FIELD COMPONENTS ──────────────────────────────────────────────────────────
const Section = ({ id, icon: Icon, title, desc, children, accent }) => (
  <div
    id={id}
    className={`bg-white rounded-xl border shadow-admin overflow-hidden scroll-mt-6 ${
      accent ? 'border-red-200' : 'border-admin-200'
    }`}
  >
    <div className={`px-6 py-4 border-b flex items-center gap-3 ${
      accent ? 'border-red-100 bg-red-50/40' : 'border-admin-100 bg-admin-50/40'
    }`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
        accent ? 'bg-red-100' : 'bg-brand-50'
      }`}>
        <Icon size={17} className={accent ? 'text-red-600' : 'text-brand-600'} />
      </div>
      <div>
        <h2 className="font-admin font-semibold text-admin-900 text-base leading-tight">{title}</h2>
        {desc && <p className="text-admin-400 text-xs mt-0.5">{desc}</p>}
      </div>
    </div>
    <div className="p-6 space-y-5">{children}</div>
  </div>
)

const SubHeading = ({ children }) => (
  <p className="text-xs font-admin font-bold text-admin-400 uppercase tracking-widest pt-1">
    {children}
  </p>
)

const Divider = () => <div className="border-t border-admin-100" />

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-admin font-semibold text-admin-600 uppercase tracking-wide mb-1.5">
      {label}
    </label>
    {children}
    {hint && <p className="text-admin-400 text-xs mt-1">{hint}</p>}
  </div>
)

const Input = (props) => (
  <input
    {...props}
    className="w-full border border-admin-200 rounded-lg px-3 py-2.5 text-sm font-admin
      text-admin-800 placeholder-admin-300 focus:outline-none focus:ring-2
      focus:ring-brand-400 focus:border-transparent bg-white transition-all"
  />
)

const Toggle = ({ label, desc, checked, onChange, disabled, danger }) => (
  <label className={`flex items-start gap-3 cursor-pointer select-none ${
    disabled ? 'opacity-40 cursor-not-allowed' : ''
  }`}>
    <div className="relative mt-0.5 flex-shrink-0">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
      {/* pill */}
      <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${
        checked
          ? danger ? 'bg-red-500' : 'bg-brand-500'
          : 'bg-admin-200'
      }`}>
        {/* knob */}
        <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform duration-200
          ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </div>
    </div>
    <div className="pt-0.5">
      <p className={`text-sm font-admin font-medium leading-snug ${
        danger ? 'text-red-800' : 'text-admin-800'
      }`}>{label}</p>
      {desc && <p className="text-admin-400 text-xs mt-0.5 leading-relaxed">{desc}</p>}
    </div>
  </label>
)

// ── BRANCH SELECTOR (superadmin only) ─────────────────────────────────────────
function BranchSelector({ branches, selectedId, onChange }) {
  const [open, setOpen] = useState(false)
  const selected = branches.find(b => b._id === selectedId)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3.5 py-2 bg-white border border-admin-200
          rounded-xl text-sm font-admin text-admin-700 hover:border-admin-300 shadow-admin
          transition-all min-w-[200px]"
      >
        <GitBranch size={14} className="text-brand-500 flex-shrink-0" />
        <span className="flex-1 text-left truncate">
          {selected ? selected.name : 'Select branch'}
        </span>
        <ChevronDown size={13} className={`text-admin-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 bg-white border border-admin-200 rounded-xl
            shadow-admin-lg z-20 min-w-[240px] overflow-hidden">
            {branches.map(b => (
              <button
                key={b._id}
                type="button"
                onClick={() => { onChange(b._id); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-admin
                  text-left transition-colors hover:bg-brand-50 ${
                    b._id === selectedId ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-admin-700'
                  }`}
              >
                <GitBranch size={13} className={b._id === selectedId ? 'text-brand-500' : 'text-admin-300'} />
                <span className="flex-1 truncate">{b.name}</span>
                {b.isDefault && (
                  <span className="text-[10px] font-admin font-bold px-1.5 py-0.5 rounded-full
                    bg-brand-100 text-brand-600">default</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── SETTINGS NAV (left sidebar) ───────────────────────────────────────────────
function SettingsNav({ active, isSuperAdmin, dirty }) {
  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const visible = NAV.filter(n => !n.superAdminOnly || isSuperAdmin)

  return (
    <nav className="space-y-0.5">
      {visible.map(({ id, icon: Icon, label }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => scrollTo(id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-admin
              font-medium transition-all text-left group ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-admin-500 hover:bg-admin-50 hover:text-admin-800'
              }`}
          >
            <Icon size={15} className={isActive ? 'text-brand-500' : 'text-admin-400 group-hover:text-admin-600'} />
            <span className="flex-1 truncate">{label}</span>
            {isActive && (
              <div className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
            )}
          </button>
        )
      })}
    </nav>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuth()
  const { applySettings } = useAppSettings()
  const isSuperAdmin = user?.role === 'superadmin'

  const [form, setForm]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [dirty, setDirty]           = useState(false)
  const [branches, setBranches]     = useState([])
  const [activeSection, setActive]  = useState('shop')
  const [targetBranchId, setTarget] = useState(null)

  // Load branch list for superadmin
  useEffect(() => {
    if (!isSuperAdmin) return
    adminBranchService.getAll(true)
      .then(res => setBranches(res.data?.data || []))
      .catch(() => {})
  }, [isSuperAdmin])

  // Load settings whenever targetBranchId changes
  useEffect(() => {
    setLoading(true)
    setDirty(false)
    const fetch = targetBranchId
      ? adminSettingsService.getForBranch(targetBranchId)
      : adminSettingsService.get()

    fetch
      .then(res => setForm({
        requireOrderApproval: false,
        enableOrderHours: false,
        orderAcceptanceStart: '07:00',
        orderAcceptanceEnd: '20:00',
        deliveryPricingMode: 'flat',
        branchLat: null,
        branchLng: null,
        maxDeliveryKm: null,
        deliveryZones: [],
        autoHideOutOfStock: false,
        allowProductReviews: false,
        blockNewRegistrations: false,
        requirePhoneVerification: false,
        requireEmailVerification: false,
        receiptFooterNote: '',
        shopPhones: [],
        kraPin: '',
        vatEnabled: false,
        vatRate: 16,
        ...res.data.data,
      }))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [targetBranchId])

  // Track active section via IntersectionObserver
  useEffect(() => {
    if (!form) return
    const observers = []
    NAV.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id) },
        { rootMargin: '-10% 0px -80% 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [form])

  const set = (key, value) => {
    setForm(f => ({ ...f, [key]: value }))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let res
      if (targetBranchId) {
        res = await adminSettingsService.updateForBranch(targetBranchId, form)
      } else {
        res = await adminSettingsService.update(form)
        applySettings(res.data.data)
      }
      setForm(res.data.data)
      setDirty(false)
      toast.success('Settings saved')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const activeBranch = branches.find(b => b._id === targetBranchId)

  if (loading || !form) return (
    <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto pb-28">

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
        <div>
          <div className="mb-3"><OnboardingReturnLink /></div>
          <h1 className="text-2xl font-admin font-bold text-admin-900 tracking-tight">Settings</h1>
          <p className="text-admin-400 text-sm mt-0.5">Manage shop configuration and preferences</p>
        </div>

        {isSuperAdmin && branches.length > 0 && (
          <div className="flex flex-col items-end gap-1.5">
            <p className="text-xs font-admin font-semibold text-admin-400 uppercase tracking-wide">
              Editing Branch
            </p>
            <BranchSelector
              branches={branches}
              selectedId={targetBranchId}
              onChange={id => setTarget(id)}
            />
          </div>
        )}
      </div>

      {/* Cross-branch editing banner */}
      {isSuperAdmin && activeBranch && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 flex items-center gap-2.5">
          <GitBranch size={14} className="text-blue-500 flex-shrink-0" />
          <p className="text-blue-700 text-xs font-admin">
            You are editing settings for <strong>{activeBranch.name}</strong>.
            Changes affect that branch only.
          </p>
        </div>
      )}

      {/* ── TWO-COLUMN LAYOUT ─────────────────────────────────────────────── */}
      <div className="flex gap-8 items-start">

        {/* ── LEFT NAV (desktop only) ───────────────────────────────────── */}
        <aside className="hidden lg:block w-44 flex-shrink-0 sticky top-6">
          <div className="bg-white border border-admin-200 rounded-xl shadow-admin p-2">
            <p className="text-[10px] font-admin font-bold text-admin-400 uppercase tracking-widest px-3 pt-2 pb-1.5">
              Sections
            </p>
            <SettingsNav active={activeSection} isSuperAdmin={isSuperAdmin} dirty={dirty} />
          </div>

          {dirty && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 animate-pulse" />
              <p className="text-amber-700 text-xs font-admin font-medium">Unsaved changes</p>
            </div>
          )}
        </aside>

        {/* ── SECTIONS ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* ── SHOP INFO ───────────────────────────────────────────────── */}
          <Section id="shop" icon={Store} title="Shop Information"
            desc="Displayed in the footer, order confirmations and notifications">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Shop Name">
                <Input value={form.shopName} onChange={e => set('shopName', e.target.value)}
                  placeholder="Vittorios Grains & Cereals" />
              </Field>
              <Field label="Tagline">
                <Input value={form.shopTagline} onChange={e => set('shopTagline', e.target.value)}
                  placeholder="Quality grains, delivered fresh" />
              </Field>
              <Field label="Phone Number">
                <Input value={form.shopPhone} onChange={e => set('shopPhone', e.target.value)}
                  placeholder="+254 799 031 449" />
              </Field>
              <Field label="WhatsApp Number" hint="Optional — leave blank to hide WhatsApp link">
                <Input value={form.shopWhatsapp} onChange={e => set('shopWhatsapp', e.target.value)}
                  placeholder="+254 799 031 449" />
              </Field>
              <Field label="Email Address">
                <Input type="email" value={form.shopEmail} onChange={e => set('shopEmail', e.target.value)}
                  placeholder="info@example.com" />
              </Field>
              <Field label="Location">
                <Input value={form.shopLocation} onChange={e => set('shopLocation', e.target.value)}
                  placeholder="Bungoma, Kenya" />
              </Field>
              <Field label="Business Hours" hint="e.g. Mon – Sat: 7:00 AM – 7:00 PM">
                <Input value={form.shopHours} onChange={e => set('shopHours', e.target.value)}
                  placeholder="Mon – Sat: 7:00 AM – 7:00 PM" />
              </Field>
            </div>
            <Divider />
            <Field label="Additional Phone Numbers"
              hint="Display multiple phone numbers in the footer (max 20 characters each)">
              <div className="space-y-2">
                {(form.shopPhones || []).map((phone, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input value={phone} 
                      onChange={e => {
                        const phones = [...(form.shopPhones || [])];
                        phones[idx] = e.target.value;
                        set('shopPhones', phones);
                      }}
                      placeholder="+254 712 345 678" />
                    <button
                      type="button"
                      onClick={() => {
                        const phones = (form.shopPhones || []).filter((_, i) => i !== idx);
                        set('shopPhones', phones);
                      }}
                      className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg
                        text-red-600 hover:bg-red-100 transition-colors flex-shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => set('shopPhones', [...(form.shopPhones || []), ''])}
                  className="flex items-center gap-2 px-3 py-2.5 bg-brand-50 border border-brand-200
                    rounded-lg text-brand-600 hover:bg-brand-100 transition-colors text-sm font-admin">
                  <Plus size={16} />
                  Add Phone Number
                </button>
              </div>
            </Field>
            <Divider />
            <Field label="Receipt Footer Note"
              hint="Printed at the bottom of every order confirmation">
              <textarea
                rows={2}
                value={form.receiptFooterNote}
                onChange={e => set('receiptFooterNote', e.target.value)}
                placeholder="Thank you for shopping with us!"
                className="w-full border border-admin-200 rounded-lg px-3 py-2.5 text-sm font-admin
                  text-admin-800 placeholder-admin-300 focus:outline-none focus:ring-2
                  focus:ring-brand-400 focus:border-transparent resize-none"
              />
            </Field>
          </Section>

          {/* ── TAX & COMPLIANCE ────────────────────────────────────────── */}
          <Section id="tax" icon={Percent} title="Tax & Compliance"
            desc="KRA PIN, VAT settings — printed on every customer receipt">

            <Field label="KRA PIN"
              hint="Your business KRA PIN — printed on every receipt as required by Kenya Revenue Authority">
              <div className="relative">
                <input
                  type="text"
                  value={form.kraPin}
                  onChange={e => set('kraPin', e.target.value.toUpperCase())}
                  placeholder="e.g. P051272345T"
                  maxLength={20}
                  className="w-full border border-admin-200 rounded-lg px-3 py-2.5 text-sm
                    text-admin-800 placeholder-admin-300 focus:outline-none focus:ring-2
                    focus:ring-brand-400 focus:border-transparent bg-white transition-all
                    tracking-widest uppercase font-mono"
                />
              </div>
            </Field>

            {form.kraPin && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5
                flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                <p className="text-green-700 text-xs">
                  KRA PIN <strong className="font-mono tracking-widest">{form.kraPin}</strong> will appear on all receipts.
                </p>
              </div>
            )}

            <Divider />
            <SubHeading>Value Added Tax (VAT)</SubHeading>

            <Toggle
              label="Charge VAT on Orders"
              desc="VAT is added on top of the order subtotal. The rate and amount are printed on the receipt."
              checked={form.vatEnabled}
              onChange={e => set('vatEnabled', e.target.checked)}
            />

            {form.vatEnabled && (
              <div className="space-y-4 pl-1">
                <Field label="VAT Rate (%)" hint="Kenya standard rate is 16%. Enter 0 for zero-rated items.">
                  <div className="relative max-w-[160px]">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.vatRate}
                      onChange={e => set('vatRate', Number(e.target.value))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-400
                      text-sm font-admin font-semibold pointer-events-none">%</span>
                  </div>
                </Field>

                {/* Live preview */}
                <div className="bg-admin-50 border border-admin-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-admin font-bold text-admin-500 uppercase tracking-widest mb-3">
                    Receipt Preview (example order KES 5,000)
                  </p>
                  {[
                    { label: 'Subtotal', value: 'KES 5,000.00' },
                    { label: `VAT @ ${form.vatRate}%`, value: `KES ${(5000 * (form.vatRate / 100)).toLocaleString('en-KE', { minimumFractionDigits: 2 })}` },
                    { label: 'Delivery Fee', value: 'KES —' },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between text-xs font-admin text-admin-600">
                      <span>{row.label}</span>
                      <span className="font-mono">{row.value}</span>
                    </div>
                  ))}
                  <div className="border-t border-admin-200 pt-2 flex justify-between text-sm font-admin font-bold text-admin-900">
                    <span>Total Payable</span>
                    <span className="font-mono">
                      KES {(5000 + 5000 * (form.vatRate / 100)).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!form.vatEnabled && (
              <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                <Info size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-blue-700 text-xs font-admin leading-relaxed">
                  VAT is currently <strong>off</strong> — orders are not taxed. Enable to add VAT to all new orders.
                  Existing orders are unaffected (VAT is snapshotted at placement).
                </p>
              </div>
            )}
          </Section>

          {/* ── ORDERS ──────────────────────────────────────────────────── */}
          <Section id="orders" icon={ShoppingCart} title="Orders"
            desc="Controls how orders are placed and processed">

            <SubHeading>Pricing</SubHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Minimum Order Value (KES)" hint="Set to 0 for no minimum">
                <Input type="number" min="0" value={form.minimumOrderValue}
                  onChange={e => set('minimumOrderValue', Number(e.target.value))} />
              </Field>
              <Field label="Low Stock Alert Threshold" hint="Alert when stock falls below this number">
                <Input type="number" min="1" value={form.defaultLowStockThreshold}
                  onChange={e => set('defaultLowStockThreshold', Number(e.target.value))} />
              </Field>
              <Field label="Auto-cancel Pending Orders (hours)"
                hint="0 = disabled">
                <Input type="number" min="0" value={form.autoCancelHours}
                  onChange={e => set('autoCancelHours', Number(e.target.value))} />
              </Field>
            </div>

            <Divider />
            <SubHeading>Payment Methods</SubHeading>
            <div className="space-y-4">
              <Toggle label="M-Pesa (STK Push)"
                desc="Customers can pay via Safaricom M-Pesa"
                checked={form.allowMpesa}
                onChange={e => set('allowMpesa', e.target.checked)} />
              <Toggle label="Pay on Pickup"
                desc="Customers can pay when collecting from the shop"
                checked={form.allowPayOnPickup}
                onChange={e => set('allowPayOnPickup', e.target.checked)} />
              <Toggle label="Cash on Delivery"
                desc="Customers can pay when the order is delivered"
                checked={form.allowCashOnDelivery}
                onChange={e => set('allowCashOnDelivery', e.target.checked)} />
            </div>

            <Divider />
            <SubHeading>Guest Orders</SubHeading>
            <Toggle label="Allow Guest Orders"
              desc="Customers can place orders without creating an account"
              checked={form.allowGuestOrders}
              onChange={e => set('allowGuestOrders', e.target.checked)} />

            <Divider />
            <SubHeading>Order Workflow</SubHeading>
            <div className="space-y-4">
              <Toggle label="Require Manual Approval"
                desc="New orders stay in 'Pending' until an admin manually confirms them"
                checked={form.requireOrderApproval}
                onChange={e => set('requireOrderApproval', e.target.checked)} />
              <Toggle label="Restrict Order Hours"
                desc="Only accept orders within a set time window"
                checked={form.enableOrderHours}
                onChange={e => set('enableOrderHours', e.target.checked)} />
              {form.enableOrderHours && (
                <div className="grid grid-cols-2 gap-4 pl-1">
                  <Field label="Accept From">
                    <input
                      type="time"
                      value={form.orderAcceptanceStart}
                      onChange={e => set('orderAcceptanceStart', e.target.value)}
                      className="w-full border border-admin-200 rounded-lg px-3 py-2.5 text-sm font-admin
                        text-admin-800 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                    />
                  </Field>
                  <Field label="Accept Until">
                    <input
                      type="time"
                      value={form.orderAcceptanceEnd}
                      onChange={e => set('orderAcceptanceEnd', e.target.value)}
                      className="w-full border border-admin-200 rounded-lg px-3 py-2.5 text-sm font-admin
                        text-admin-800 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                    />
                  </Field>
                </div>
              )}
            </div>

            <Divider />
            <SubHeading>Delivery Pricing Mode</SubHeading>
            <div className="space-y-4">
              {/* Mode selector */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'flat',     label: 'Flat Fee',       desc: 'One fixed fee for all deliveries' },
                  { value: 'distance', label: 'Distance-based', desc: 'Auto-calculate by GPS distance'    },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('deliveryPricingMode', opt.value)}
                    className={`text-left p-3.5 rounded-xl border-2 transition-all ${
                      form.deliveryPricingMode === opt.value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-admin-200 hover:border-admin-300 bg-white'
                    }`}
                  >
                    <p className={`text-sm font-admin font-semibold ${
                      form.deliveryPricingMode === opt.value ? 'text-brand-800' : 'text-admin-800'
                    }`}>{opt.label}</p>
                    <p className="text-xs font-admin text-admin-400 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* ── FLAT MODE ── */}
              {form.deliveryPricingMode !== 'distance' && (
                <Field label="Delivery Fee (KES)" hint="Set to 0 for free delivery">
                  <Input type="number" min="0" value={form.deliveryFee}
                    onChange={e => set('deliveryFee', Number(e.target.value))} />
                </Field>
              )}

              {/* ── DISTANCE MODE ── */}
              {form.deliveryPricingMode === 'distance' && (
                <div className="space-y-5">
                  {/* Branch coordinates */}
                  <div className="bg-admin-50 border border-admin-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-brand-500 flex-shrink-0" />
                      <p className="text-sm font-admin font-semibold text-admin-800">Shop / Branch Location</p>
                    </div>
                    <p className="text-xs font-admin text-admin-500">
                      The GPS origin used to measure distance to the customer. Click the button to set from your current location, or enter manually.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Latitude">
                        <Input type="number" step="any"
                          placeholder="e.g. 0.5635"
                          value={form.branchLat ?? ''}
                          onChange={e => set('branchLat', e.target.value === '' ? null : Number(e.target.value))} />
                      </Field>
                      <Field label="Longitude">
                        <Input type="number" step="any"
                          placeholder="e.g. 34.5606"
                          value={form.branchLng ?? ''}
                          onChange={e => set('branchLng', e.target.value === '' ? null : Number(e.target.value))} />
                      </Field>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!navigator.geolocation) {
                          toast.error('Geolocation not supported by this browser')
                          return
                        }
                        navigator.geolocation.getCurrentPosition(
                          ({ coords }) => {
                            set('branchLat', Math.round(coords.latitude  * 1e6) / 1e6)
                            set('branchLng', Math.round(coords.longitude * 1e6) / 1e6)
                            toast.success('Branch location set — save settings to apply')
                          },
                          () => toast.error('Could not detect location')
                        )
                      }}
                      className="flex items-center gap-1.5 text-xs font-admin font-semibold text-brand-600
                        hover:text-brand-700 transition-colors"
                    >
                      <MapPin size={12} /> Use my current location
                    </button>
                    {form.branchLat && form.branchLng && (
                      <p className="text-xs font-admin text-green-700 bg-green-50 border border-green-200
                        rounded-lg px-3 py-2">
                        Set: {form.branchLat}, {form.branchLng}
                      </p>
                    )}
                  </div>

                  {/* Fallback flat fee */}
                  <Field label="Fallback Fee (KES)"
                    hint="Applied if customer location is unavailable or outside all bands">
                    <Input type="number" min="0" value={form.deliveryFee}
                      onChange={e => set('deliveryFee', Number(e.target.value))} />
                  </Field>

                  {/* Max delivery radius */}
                  <Field label="Max Delivery Radius (km)"
                    hint="Beyond this distance delivery is disabled — customer can still pick up. Leave blank for no limit.">
                    <Input
                      type="number" min="1" step="1"
                      placeholder="e.g. 55 — leave blank for no limit"
                      value={form.maxDeliveryKm ?? ''}
                      onChange={e => set('maxDeliveryKm', e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </Field>

                  {/* Distance bands */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-admin font-bold text-admin-500 uppercase tracking-widest">Distance Bands</p>
                      <button
                        type="button"
                        onClick={() => set('deliveryZones', [...(form.deliveryZones || []), { name: '', minKm: 0, maxKm: 9999, fee: 0 }])}
                        className="flex items-center gap-1 text-xs font-admin font-semibold text-brand-600
                          hover:text-brand-700 transition-colors"
                      >
                        <Plus size={12} /> Add Band
                      </button>
                    </div>

                    {/* Header row */}
                    {(form.deliveryZones || []).length > 0 && (
                      <div className="grid grid-cols-[1fr_80px_80px_90px_32px] gap-2 px-1">
                        {['Label', 'From km', 'To km', 'Fee (KES)', ''].map(h => (
                          <p key={h} className="text-[10px] font-admin font-bold text-admin-400 uppercase tracking-wide">{h}</p>
                        ))}
                      </div>
                    )}

                    {(form.deliveryZones || []).map((zone, i) => (
                      <div key={i} className="grid grid-cols-[1fr_80px_80px_90px_32px] gap-2 items-center">
                        <input
                          type="text"
                          value={zone.name || ''}
                          onChange={e => {
                            const zones = [...form.deliveryZones]
                            zones[i] = { ...zones[i], name: e.target.value }
                            set('deliveryZones', zones)
                          }}
                          placeholder="e.g. Within Town"
                          className="border border-admin-200 rounded-lg px-3 py-2 text-sm font-admin
                            text-admin-800 placeholder-admin-300 focus:outline-none focus:ring-2
                            focus:ring-brand-400 bg-white"
                        />
                        <input
                          type="number" min="0" step="0.1"
                          value={zone.minKm ?? 0}
                          onChange={e => {
                            const zones = [...form.deliveryZones]
                            zones[i] = { ...zones[i], minKm: Number(e.target.value) }
                            set('deliveryZones', zones)
                          }}
                          className="border border-admin-200 rounded-lg px-2 py-2 text-sm font-admin
                            text-admin-800 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                        />
                        <input
                          type="number" min="0" step="0.1"
                          value={zone.maxKm === 9999 ? '' : (zone.maxKm ?? '')}
                          placeholder="∞"
                          onChange={e => {
                            const zones = [...form.deliveryZones]
                            zones[i] = { ...zones[i], maxKm: e.target.value === '' ? 9999 : Number(e.target.value) }
                            set('deliveryZones', zones)
                          }}
                          className="border border-admin-200 rounded-lg px-2 py-2 text-sm font-admin
                            text-admin-800 placeholder-admin-300 focus:outline-none focus:ring-2
                            focus:ring-brand-400 bg-white"
                        />
                        <input
                          type="number" min="0"
                          value={zone.fee ?? 0}
                          onChange={e => {
                            const zones = [...form.deliveryZones]
                            zones[i] = { ...zones[i], fee: Number(e.target.value) }
                            set('deliveryZones', zones)
                          }}
                          className="border border-admin-200 rounded-lg px-2 py-2 text-sm font-admin
                            text-admin-800 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => set('deliveryZones', form.deliveryZones.filter((_, j) => j !== i))}
                          className="p-1.5 text-admin-300 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}

                    {(form.deliveryZones || []).length === 0 && (
                      <p className="text-xs font-admin text-admin-400 text-center py-4 bg-admin-50 rounded-lg">
                        No bands configured. Add one to get started.
                      </p>
                    )}

                    <p className="text-xs font-admin text-admin-400 leading-relaxed">
                      Example: 0–5 km = KES 100 · 5–15 km = KES 250 · 15–∞ km = KES 400.
                      Leave "To km" blank for unlimited.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* ── CATALOG ─────────────────────────────────────────────────── */}
          <Section id="catalog" icon={Tag} title="Catalog"
            desc="Control how products appear and what customers can do">
            <div className="space-y-4">
              <Toggle label="Auto-hide Out-of-Stock Products"
                desc="Products with zero stock are automatically hidden from the storefront"
                checked={form.autoHideOutOfStock}
                onChange={e => set('autoHideOutOfStock', e.target.checked)} />
              <Toggle label="Allow Customer Reviews"
                desc="Customers can leave star ratings and comments on products they've purchased"
                checked={form.allowProductReviews}
                onChange={e => set('allowProductReviews', e.target.checked)} />
            </div>
          </Section>

          {/* ── CUSTOMER ACCOUNTS ───────────────────────────────────────── */}
          <Section id="customers" icon={UserCheck} title="Customer Accounts"
            desc="Control sign-ups and verification requirements">
            <div className="space-y-4">
              <Toggle label="Block New Registrations"
                desc="Prevent new customers from creating accounts (existing accounts unaffected)"
                checked={form.blockNewRegistrations}
                onChange={e => set('blockNewRegistrations', e.target.checked)} />
              {form.blockNewRegistrations && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-amber-700 text-xs font-admin">
                    New customer registrations are <strong>blocked</strong>. Only existing accounts can log in.
                  </p>
                </div>
              )}
            </div>
            <Divider />
            <SubHeading>Verification</SubHeading>
            <div className="space-y-4">
              <Toggle label="Require Phone Verification"
                desc="New accounts must verify their phone number before placing orders"
                checked={form.requirePhoneVerification}
                onChange={e => set('requirePhoneVerification', e.target.checked)} />
              <Toggle label="Require Email Verification"
                desc="New accounts must confirm their email address before logging in"
                checked={form.requireEmailVerification}
                onChange={e => set('requireEmailVerification', e.target.checked)} />
            </div>
          </Section>

          {/* ── NOTIFICATIONS ───────────────────────────────────────────── */}
          <Section id="notifications" icon={Bell} title="Notifications"
            desc="Control which events trigger alerts">
            <SubHeading>Admin Alerts</SubHeading>
            <div className="space-y-4">
              <Toggle label="New Order Received"
                desc="Alert admin when a new order is placed"
                checked={form.notifyAdminNewOrder}
                onChange={e => set('notifyAdminNewOrder', e.target.checked)} />
              <Toggle label="Low Stock Warning"
                desc="Alert admin when any product falls below its threshold"
                checked={form.notifyAdminLowStock}
                onChange={e => set('notifyAdminLowStock', e.target.checked)} />
            </div>

            <Divider />
            <SubHeading>Customer Notifications</SubHeading>
            <div className="space-y-4">
              <Toggle label="Order Approved"
                desc="Notify customer when their order is confirmed"
                checked={form.notifyCustomerOnApproval}
                onChange={e => set('notifyCustomerOnApproval', e.target.checked)} />
              <Toggle label="Order Rejected"
                desc="Notify customer when their order is declined (includes reason)"
                checked={form.notifyCustomerOnRejection}
                onChange={e => set('notifyCustomerOnRejection', e.target.checked)} />
              <Toggle label="Out for Delivery"
                desc="Notify customer when their order is dispatched"
                checked={form.notifyCustomerOnDelivery}
                onChange={e => set('notifyCustomerOnDelivery', e.target.checked)} />
            </div>

            <Divider />
            <SubHeading>Delivery Channels</SubHeading>
            <div className="space-y-4">
              <Toggle label="SMS Notifications"
                desc="Send notifications via SMS using Africa's Talking. Add AT_USERNAME and AT_API_KEY to your backend .env to activate."
                checked={form.smsEnabled}
                onChange={e => set('smsEnabled', e.target.checked)} />
              <Toggle label="Email Notifications"
                desc="Send transactional emails via Brevo. Add BREVO_SMTP_USER and BREVO_SMTP_KEY to your backend .env to activate."
                checked={form.emailEnabled}
                onChange={e => set('emailEnabled', e.target.checked)} />
            </div>
          </Section>

          {/* ── SYSTEM (SuperAdmin only) ─────────────────────────────────── */}
          {isSuperAdmin && (
            <Section id="system" icon={Shield} title="System Settings"
              desc="Platform-level controls — SuperAdmin only" accent>

              <SubHeading>Availability</SubHeading>
              <div className="space-y-4">
                <Toggle
                  label="Maintenance Mode"
                  desc="Hides the shop from customers and shows a maintenance message. Admin panel remains accessible."
                  checked={form.maintenanceMode}
                  onChange={e => set('maintenanceMode', e.target.checked)}
                />
                {form.maintenanceMode && (
                  <Field label="Maintenance Message"
                    hint="Shown to customers visiting the shop during maintenance">
                    <textarea
                      rows={3}
                      value={form.maintenanceMessage}
                      onChange={e => set('maintenanceMessage', e.target.value)}
                      className="w-full border border-admin-200 rounded-lg px-3 py-2.5 text-sm font-admin
                        text-admin-800 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                    />
                  </Field>
                )}
                {form.maintenanceMode && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-amber-700 text-xs font-admin">
                      Maintenance mode is <strong>ON</strong> — customers cannot access the shop right now.
                    </p>
                  </div>
                )}
              </div>

              <Divider />
              <div className="space-y-4">
                <Toggle
                  label="Platform Lock"
                  desc="Blocks all write operations on this branch — orders, stock updates, products. Use before major migrations."
                  checked={form.platformLocked}
                  onChange={e => set('platformLocked', e.target.checked)}
                  danger
                />
                {form.platformLocked && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <Lock size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-red-700 text-xs font-admin">
                      <strong>Platform is locked.</strong> All write operations on this branch are blocked.
                      Unlock before resuming normal operations.
                    </p>
                  </div>
                )}
              </div>

              <Divider />
              <SubHeading>Access Controls</SubHeading>
              <div className="space-y-4">
                <Toggle
                  label="Allow New Admin Accounts"
                  desc="When disabled, no new admin/staff accounts can be created on this platform."
                  checked={form.allowNewAdminAccounts}
                  onChange={e => set('allowNewAdminAccounts', e.target.checked)}
                />
                {!form.allowNewAdminAccounts && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <Users size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-amber-700 text-xs font-admin">
                      New admin account creation is <strong>disabled</strong>.
                      Re-enable to allow new staff or admin accounts.
                    </p>
                  </div>
                )}
              </div>

              <Divider />
              <SubHeading>Platform Limits</SubHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Max Products per Branch" hint="0 = unlimited">
                  <div className="relative">
                    <Package size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-300" />
                    <input
                      type="number" min="0" value={form.maxProductsPerBranch}
                      onChange={e => set('maxProductsPerBranch', Number(e.target.value))}
                      className="w-full border border-admin-200 rounded-lg pl-8 pr-3 py-2.5 text-sm font-admin
                        text-admin-800 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                    />
                  </div>
                </Field>
                <Field label="Max Staff per Branch" hint="0 = unlimited">
                  <div className="relative">
                    <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-300" />
                    <input
                      type="number" min="0" value={form.maxStaffPerBranch}
                      onChange={e => set('maxStaffPerBranch', Number(e.target.value))}
                      className="w-full border border-admin-200 rounded-lg pl-8 pr-3 py-2.5 text-sm font-admin
                        text-admin-800 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                    />
                  </div>
                </Field>
                <Field label="Log Retention (days)" hint="0 = keep forever">
                  <div className="relative">
                    <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-300" />
                    <input
                      type="number" min="0" value={form.logRetentionDays}
                      onChange={e => set('logRetentionDays', Number(e.target.value))}
                      className="w-full border border-admin-200 rounded-lg pl-8 pr-3 py-2.5 text-sm font-admin
                        text-admin-800 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                    />
                  </div>
                </Field>
              </div>

            </Section>
          )}
        </div>
      </div>

      {/* ── STICKY SAVE BAR ───────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-60 bg-white/90 backdrop-blur-sm
        border-t border-admin-200 px-6 py-3.5 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className={`text-sm font-admin transition-all duration-200 ${
            dirty ? 'text-amber-600 opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
            {activeBranch
              ? `Unsaved changes — ${activeBranch.name}`
              : 'You have unsaved changes'}
          </p>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-lg
              text-sm font-admin font-semibold hover:bg-brand-600 active:bg-brand-700
              transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-admin"
          >
            <Save size={15} />
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
