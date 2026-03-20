import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { adminSettingsService } from '../../../services/admin/settings.service'
import {
  Store, ShoppingCart, Bell, Shield, Save, AlertTriangle
} from 'lucide-react'
import Spinner from '../../../components/ui/Spinner'
import toast from 'react-hot-toast'

// ── FIELD COMPONENTS ──────────────────────────────────────────────────────────
const Section = ({ icon: Icon, title, desc, children }) => (
  <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden">
    <div className="px-5 py-4 border-b border-admin-100 flex items-center gap-3">
      <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
        <Icon size={16} className="text-brand-600" />
      </div>
      <div>
        <h2 className="font-admin font-semibold text-admin-900 text-sm">{title}</h2>
        {desc && <p className="text-admin-400 text-xs mt-0.5">{desc}</p>}
      </div>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
)

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-admin font-semibold text-admin-600 uppercase tracking-wide mb-1.5">
      {label}
    </label>
    {children}
    {hint && <p className="text-admin-400 text-xs mt-1">{hint}</p>}
  </div>
)

const Input = ({ ...props }) => (
  <input
    {...props}
    className="w-full border border-admin-200 rounded-lg px-3 py-2.5 text-sm font-admin
      text-admin-800 placeholder-admin-400 focus:outline-none focus:ring-2
      focus:ring-brand-400 focus:border-transparent bg-white transition-all"
  />
)

const Toggle = ({ label, desc, checked, onChange, disabled }) => (
  <label className={`flex items-start gap-3 cursor-pointer ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
    <div className="relative mt-0.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
      <div
        className={`w-10 h-5 rounded-full transition-colors ${checked ? 'bg-brand-500' : 'bg-admin-200'}`}
        onClick={!disabled ? onChange : undefined}
      >
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform
          ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </div>
    </div>
    <div>
      <p className="text-sm font-admin font-medium text-admin-800">{label}</p>
      {desc && <p className="text-admin-400 text-xs mt-0.5">{desc}</p>}
    </div>
  </label>
)

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'superadmin'

  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    adminSettingsService.get()
      .then(res => setForm(res.data.data))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const set = (key, value) => {
    setForm(f => ({ ...f, [key]: value }))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await adminSettingsService.update(form)
      setForm(res.data.data)
      setDirty(false)
      toast.success('Settings saved')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !form) return (
    <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto pb-28">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-admin font-bold text-admin-900">Settings</h1>
          <p className="text-admin-400 text-sm mt-0.5">Manage shop configuration and preferences</p>
        </div>
      </div>

      <div className="space-y-6">

        {/* ── SHOP INFO ─────────────────────────────────────────────────── */}
        <Section icon={Store} title="Shop Information"
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
        </Section>

        {/* ── ORDER SETTINGS ────────────────────────────────────────────── */}
        <Section icon={ShoppingCart} title="Order Settings"
          desc="Controls how orders are placed and processed">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Field label="Delivery Fee (KES)" hint="Set to 0 for free delivery or manual pricing">
              <Input type="number" min="0" value={form.deliveryFee}
                onChange={e => set('deliveryFee', Number(e.target.value))} />
            </Field>
            <Field label="Minimum Order Value (KES)" hint="Set to 0 for no minimum">
              <Input type="number" min="0" value={form.minimumOrderValue}
                onChange={e => set('minimumOrderValue', Number(e.target.value))} />
            </Field>
            <Field label="Default Low Stock Alert" hint="Alert when stock falls below this number">
              <Input type="number" min="1" value={form.defaultLowStockThreshold}
                onChange={e => set('defaultLowStockThreshold', Number(e.target.value))} />
            </Field>
            <Field label="Auto-cancel Pending Orders (hours)"
              hint="Automatically cancel orders still pending after this many hours. Set to 0 to disable.">
              <Input type="number" min="0" value={form.autoCancelHours}
                onChange={e => set('autoCancelHours', Number(e.target.value))} />
            </Field>
          </div>

          <div className="border-t border-admin-100 pt-4 space-y-3">
            <p className="text-xs font-admin font-semibold text-admin-500 uppercase tracking-wide mb-3">
              Payment Methods
            </p>
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

          <div className="border-t border-admin-100 pt-4 space-y-3">
            <p className="text-xs font-admin font-semibold text-admin-500 uppercase tracking-wide mb-3">
              Guest Orders
            </p>
            <Toggle label="Allow Guest Orders"
              desc="Customers can place orders without creating an account"
              checked={form.allowGuestOrders}
              onChange={e => set('allowGuestOrders', e.target.checked)} />
          </div>
        </Section>

        {/* ── NOTIFICATIONS ─────────────────────────────────────────────── */}
        <Section icon={Bell} title="Notifications"
          desc="Control which events trigger alerts">
          <div className="space-y-3">
            <p className="text-xs font-admin font-semibold text-admin-500 uppercase tracking-wide">
              Admin Alerts
            </p>
            <Toggle label="New Order Received"
              desc="Alert admin when a new order is placed"
              checked={form.notifyAdminNewOrder}
              onChange={e => set('notifyAdminNewOrder', e.target.checked)} />
            <Toggle label="Low Stock Warning"
              desc="Alert admin when any product falls below its threshold"
              checked={form.notifyAdminLowStock}
              onChange={e => set('notifyAdminLowStock', e.target.checked)} />
          </div>

          <div className="border-t border-admin-100 pt-4 space-y-3">
            <p className="text-xs font-admin font-semibold text-admin-500 uppercase tracking-wide">
              Customer Notifications
            </p>
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
            <Toggle label="SMS Notifications"
              desc="Send notifications via SMS (requires Africa's Talking — Phase 2)"
              checked={form.smsEnabled}
              onChange={e => set('smsEnabled', e.target.checked)}
              disabled={true} />
          </div>
        </Section>

        {/* ── SYSTEM (SuperAdmin only) ───────────────────────────────────── */}
        {isSuperAdmin && (
          <Section icon={Shield} title="System Settings"
            desc="Platform-level controls — SuperAdmin only">
            <div className="space-y-4">
              <Toggle label="Maintenance Mode"
                desc="Hides the shop from customers and shows a maintenance message. Admin panel remains accessible."
                checked={form.maintenanceMode}
                onChange={e => set('maintenanceMode', e.target.checked)} />

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
          </Section>
        )}
      </div>

      {/* ── STICKY SAVE BUTTON ─────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-60 bg-white border-t border-admin-200 px-6 py-4 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <p className={`text-sm font-admin transition-opacity ${dirty ? 'text-amber-600 opacity-100' : 'opacity-0'}`}>
            You have unsaved changes
          </p>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 text-white rounded-lg
              text-sm font-admin font-medium hover:bg-brand-600 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed shadow-admin"
          >
            <Save size={15} />
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}