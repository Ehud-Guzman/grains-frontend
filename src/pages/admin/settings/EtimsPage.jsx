import { useState, useEffect } from 'react'
import { FileCheck, Save, Shield, Eye, EyeOff } from 'lucide-react'
import { globalSettingsService } from '../../../services/admin/globalSettings.service'
import Spinner from '../../../components/ui/Spinner'
import toast from 'react-hot-toast'

const ROLE_OPTIONS = [
  { value: 'staff',      label: 'Staff'      },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'admin',      label: 'Admin'      },
  { value: 'superadmin', label: 'Superadmin' },
]

const ETIMS_DEFAULTS = {
  enabled:      false,
  baseUrl:      'https://etims-sbx.kra.go.ke/etims-api',
  tin:          '',
  bhfId:        '00',
  deviceId:     '',
  allowedRoles: ['admin', 'superadmin'],
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-admin font-semibold text-admin-700 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-admin-400 text-xs mt-1">{hint}</p>}
    </div>
  )
}

function Input({ secret, ...props }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        {...props}
        type={secret && !show ? 'password' : 'text'}
        className="w-full border border-admin-200 rounded-xl px-4 py-2.5 text-sm font-admin
          text-admin-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400
          focus:border-transparent transition-all"
      />
      {secret && (
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-400 hover:text-admin-600">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}
    </div>
  )
}

export default function EtimsPage() {
  const [form, setForm]       = useState(ETIMS_DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    globalSettingsService.get()
      .then(res => {
        const data = res.data.data || {}
        setForm({ ...ETIMS_DEFAULTS, ...data })
      })
      .catch(() => toast.error('Failed to load eTIMS settings'))
      .finally(() => setLoading(false))
  }, [])

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const toggleRole = (role) => {
    setForm(f => ({
      ...f,
      allowedRoles: f.allowedRoles.includes(role)
        ? f.allowedRoles.filter(r => r !== role)
        : [...f.allowedRoles, role]
    }))
  }

  const save = async () => {
    if (form.enabled && (!form.tin.trim() || !form.bhfId.trim() || !form.deviceId.trim())) {
      toast.error('TIN, Branch ID, and Device Serial Number are required to enable eTIMS')
      return
    }
    setSaving(true)
    try {
      await globalSettingsService.update(form)
      toast.success('eTIMS settings saved')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <FileCheck size={20} className="text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-admin font-bold text-admin-900">KRA eTIMS</h1>
          <p className="text-admin-400 text-sm">Electronic Tax Invoice Management System — credentials and access control</p>
        </div>
      </div>

      {/* Enable toggle */}
      <div className="bg-white rounded-xl border border-admin-200 shadow-admin p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-admin font-semibold text-admin-800">Enable eTIMS Integration</p>
            <p className="text-admin-400 text-xs mt-0.5">
              When enabled, fiscal invoices are automatically submitted to KRA after every payment confirmation.
            </p>
          </div>
          <button
            onClick={() => set('enabled', !form.enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.enabled ? 'bg-green-500' : 'bg-admin-200'
            }`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              form.enabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Credentials */}
      <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden">
        <div className="px-6 py-4 border-b border-admin-100 bg-admin-50/40">
          <h2 className="font-admin font-semibold text-admin-900">API Credentials</h2>
          <p className="text-admin-400 text-xs mt-0.5">
            Obtain these from KRA's eTIMS portal. Use the sandbox URL while testing.
          </p>
        </div>
        <div className="p-6 space-y-5">

          <Field label="Base URL" hint="Sandbox: https://etims-sbx.kra.go.ke/etims-api — Production: https://etims.kra.go.ke/etims-api">
            <Input
              value={form.baseUrl}
              onChange={e => set('baseUrl', e.target.value)}
              placeholder="https://etims-sbx.kra.go.ke/etims-api"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="KRA PIN (TIN)" hint="e.g. P051234567X">
              <Input
                secret
                value={form.tin}
                onChange={e => set('tin', e.target.value.toUpperCase())}
                placeholder="P051234567X"
              />
            </Field>
            <Field label="Branch ID (BHF ID)" hint="Usually 00 for the main branch">
              <Input
                value={form.bhfId}
                onChange={e => set('bhfId', e.target.value)}
                placeholder="00"
              />
            </Field>
          </div>

          <Field label="Device Serial Number" hint="eTIMS device serial issued by KRA">
            <Input
              secret
              value={form.deviceId}
              onChange={e => set('deviceId', e.target.value)}
              placeholder="Device serial"
            />
          </Field>

        </div>
      </div>

      {/* Access control */}
      <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden">
        <div className="px-6 py-4 border-b border-admin-100 bg-admin-50/40 flex items-center gap-2">
          <Shield size={15} className="text-admin-500" />
          <div>
            <h2 className="font-admin font-semibold text-admin-900">Manual Resubmit — Allowed Roles</h2>
            <p className="text-admin-400 text-xs mt-0.5">
              These roles can see eTIMS status on orders and trigger a manual resubmission.
            </p>
          </div>
        </div>
        <div className="p-6 flex flex-wrap gap-3">
          {ROLE_OPTIONS.map(({ value, label }) => {
            const checked = form.allowedRoles.includes(value)
            return (
              <button
                key={value}
                onClick={() => toggleRole(value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-admin
                  font-medium transition-all ${
                  checked
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-admin-200 bg-white text-admin-500 hover:border-admin-300'
                }`}>
                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  checked ? 'border-brand-500 bg-brand-500' : 'border-admin-300'
                }`}>
                  {checked && <span className="w-2 h-2 rounded-sm bg-white block" />}
                </span>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl
            text-sm font-admin font-semibold hover:bg-brand-700 transition-all
            disabled:opacity-60 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]">
          {saving ? <Spinner size="sm" /> : <Save size={15} />}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

    </div>
  )
}
