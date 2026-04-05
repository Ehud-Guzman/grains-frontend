import { useState, useEffect } from 'react'
import {
  Plus, Edit, Trash2, Users, GitBranch, X, MapPin, Phone,
  CheckCircle, Globe, AlertTriangle, UserPlus, RefreshCw,
  Eye, EyeOff, ChevronDown, ChevronUp,
} from 'lucide-react'
import { adminBranchService } from '../../../services/admin/branch.service'
import { adminUserService } from '../../../services/admin/user.service'
import { formatDate } from '../../../utils/helpers'
import toast from 'react-hot-toast'
import Spinner from '../../../components/ui/Spinner'

// ── STATUS BADGE ──────────────────────────────────────────────────────────────
function StatusBadge({ isActive, isDefault }) {
  if (isDefault) return (
    <span className="inline-flex items-center gap-1 text-xs font-admin font-semibold
      px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
      <span className="w-1.5 h-1.5 rounded-full bg-brand-500" /> Default
    </span>
  )
  if (isActive) return (
    <span className="inline-flex items-center gap-1 text-xs font-admin font-semibold
      px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-admin font-semibold
      px-2.5 py-1 rounded-full bg-admin-100 text-admin-500 border border-admin-200">
      <span className="w-1.5 h-1.5 rounded-full bg-admin-400" /> Inactive
    </span>
  )
}

const ROLE_CONFIG = {
  staff:      { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
  supervisor: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  admin:      { bg: 'bg-brand-50',  text: 'text-brand-700',  border: 'border-brand-200'  },
  superadmin: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'    },
}
function RoleBadge({ role }) {
  const c = ROLE_CONFIG[role] || ROLE_CONFIG.staff
  return (
    <span className={`text-xs font-admin font-semibold px-2 py-0.5 rounded-full border capitalize ${c.bg} ${c.text} ${c.border}`}>
      {role}
    </span>
  )
}

// ── SLUG HELPER ───────────────────────────────────────────────────────────────
const toSlug = (name) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')

// ── FIELD ─────────────────────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-admin font-semibold text-admin-600 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = `w-full border border-admin-200 rounded-xl px-3.5 py-2.5 text-sm font-admin
  text-admin-800 placeholder-admin-400 focus:outline-none focus:ring-2 focus:ring-brand-400
  focus:border-transparent bg-admin-50 transition-all`

// ── BRANCH FORM MODAL ─────────────────────────────────────────────────────────
function BranchModal({ branch, onClose, onSaved }) {
  const isEdit = !!branch
  const [form, setForm] = useState(
    isEdit
      ? { name: branch.name, slug: branch.slug, location: branch.location || '', phone: branch.phone || '', isDefault: branch.isDefault, isActive: branch.isActive }
      : { name: '', slug: '', location: '', phone: '', isDefault: false, isActive: true }
  )
  const [slugManual, setSlugManual] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleNameChange = (v) => {
    set('name', v)
    if (!slugManual) set('slug', toSlug(v))
  }

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Branch name is required')
    if (!form.slug.trim()) return toast.error('Slug is required')
    setSaving(true)
    try {
      if (isEdit) {
        await adminBranchService.update(branch._id, form)
        toast.success('Branch updated')
      } else {
        await adminBranchService.create(form)
        toast.success('Branch created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save branch')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-admin-lg border border-admin-100">

        <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <GitBranch size={15} className="text-brand-600" />
            </div>
            <h3 className="font-admin font-bold text-admin-900 text-sm">
              {isEdit ? `Edit — ${branch.name}` : 'Create New Branch'}
            </h3>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-admin-100 text-admin-400 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Branch Name" required>
            <input type="text" className={inputCls} placeholder="e.g. Nairobi CBD Branch"
              value={form.name} onChange={e => handleNameChange(e.target.value)} autoFocus />
          </Field>

          <Field label="Slug (URL key)" required>
            <div className="relative">
              <input type="text" className={inputCls + ' pr-16'} placeholder="nairobi-cbd"
                value={form.slug}
                onChange={e => { set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugManual(true) }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-admin-400 font-admin">
                auto
              </span>
            </div>
            <p className="text-xs text-admin-400 font-admin mt-1">Unique identifier — lowercase, hyphens only</p>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Location">
              <input type="text" className={inputCls} placeholder="e.g. Nairobi, Kenya"
                value={form.location} onChange={e => set('location', e.target.value)} />
            </Field>
            <Field label="Phone">
              <input type="tel" className={inputCls} placeholder="0712 345 678"
                value={form.phone} onChange={e => set('phone', e.target.value)} />
            </Field>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-1">
            {[
              { key: 'isDefault', label: 'Set as default branch', desc: 'Public shop uses this branch for products and settings' },
              { key: 'isActive',  label: 'Active',                desc: 'Inactive branches are hidden from public shop' },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer group">
                <div
                  onClick={() => set(key, !form[key])}
                  className={`relative w-10 h-5 rounded-full transition-all mt-0.5 cursor-pointer flex-shrink-0 ${
                    form[key] ? 'bg-brand-500' : 'bg-admin-200'
                  }`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm
                    transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <div>
                  <p className="text-sm font-admin font-semibold text-admin-800">{label}</p>
                  <p className="text-xs text-admin-400 font-admin mt-0.5">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 bg-brand-500 text-white rounded-xl text-sm font-admin
              font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Branch'}
          </button>
          <button onClick={onClose}
            className="flex-1 py-3 border border-admin-200 text-admin-600 rounded-xl
              text-sm font-admin font-medium hover:bg-admin-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── STAFF MODAL ───────────────────────────────────────────────────────────────
function StaffModal({ branch, onClose }) {
  const [staff, setStaff]       = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [staffRes, usersRes] = await Promise.all([
          adminBranchService.getStaff(branch._id),
          adminUserService.getAll(),
        ])
        setStaff(staffRes.data?.data || [])
        const allU = usersRes.data?.data || []
        const staffIds = new Set((staffRes.data?.data || []).map(u => u._id))
        setAllUsers(allU.filter(u => u.role !== 'superadmin' && !staffIds.has(u._id)))
      } catch {}
      finally { setLoading(false) }
    }
    fetchAll()
  }, [branch._id])

  const handleAssign = async () => {
    if (!selectedUser) return
    setAssigning(true)
    try {
      await adminBranchService.assignUser(branch._id, selectedUser)
      toast.success('User assigned to branch')
      // Refresh
      const [staffRes, usersRes] = await Promise.all([
        adminBranchService.getStaff(branch._id),
        adminUserService.getAll(),
      ])
      const newStaff = staffRes.data?.data || []
      setStaff(newStaff)
      const staffIds = new Set(newStaff.map(u => u._id))
      setAllUsers((usersRes.data?.data || []).filter(u => u.role !== 'superadmin' && !staffIds.has(u._id)))
      setSelectedUser('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign user')
    } finally { setAssigning(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-admin-lg border border-admin-100 flex flex-col max-h-[80vh]">

        <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users size={15} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-admin font-bold text-admin-900 text-sm">{branch.name} — Staff</h3>
              <p className="text-admin-400 text-xs font-admin">{staff.length} assigned</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-admin-100 text-admin-400 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Assign user */}
        <div className="px-5 py-3 border-b border-admin-100 bg-admin-50/60 flex-shrink-0">
          <p className="text-xs font-admin font-semibold text-admin-600 uppercase tracking-wide mb-2">
            Assign User to This Branch
          </p>
          <div className="flex gap-2">
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="flex-1 border border-admin-200 rounded-xl px-3 py-2 text-sm font-admin
                text-admin-800 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
            >
              <option value="">— Select a user —</option>
              {allUsers.map(u => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
            <button onClick={handleAssign} disabled={!selectedUser || assigning}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 text-white rounded-xl
                text-sm font-admin font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors">
              <UserPlus size={14} />
              {assigning ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </div>

        {/* Staff list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : staff.length === 0 ? (
            <div className="py-10 text-center">
              <Users size={24} className="text-admin-300 mx-auto mb-2" />
              <p className="text-admin-400 text-sm font-admin">No staff assigned to this branch</p>
            </div>
          ) : (
            <div className="divide-y divide-admin-50">
              {staff.map(u => (
                <div key={u._id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-brand-700 text-xs font-bold">{u.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-admin font-semibold text-admin-800 text-sm leading-tight">{u.name}</p>
                    <p className="text-admin-400 text-xs font-admin">{u.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={u.role} />
                    {u.isLocked && (
                      <span className="text-xs font-admin text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                        Locked
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-admin-100 flex-shrink-0">
          <button onClick={onClose}
            className="w-full py-2.5 border border-admin-200 text-admin-600 rounded-xl
              text-sm font-admin font-medium hover:bg-admin-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function BranchManagementPage() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [modal, setModal]       = useState(null) // { type: 'create'|'edit'|'staff', branch? }
  const [confirmDeactivate, setConfirmDeactivate] = useState(null) // branch._id

  const fetchBranches = async () => {
    setLoading(true)
    try {
      const res = await adminBranchService.getAll(true)
      setBranches(res.data?.data || [])
    } catch { toast.error('Failed to load branches') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchBranches() }, [])

  const handleDeactivate = async (branch) => {
    setConfirmDeactivate(null)
    try {
      await adminBranchService.deactivate(branch._id)
      toast.success(`${branch.name} deactivated`)
      fetchBranches()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate')
    }
  }

  const handleReactivate = async (branch) => {
    try {
      await adminBranchService.update(branch._id, { isActive: true })
      toast.success(`${branch.name} reactivated`)
      fetchBranches()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reactivate')
    }
  }

  const visible = showInactive ? branches : branches.filter(b => b.isActive || b.isDefault)

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-admin font-bold text-admin-900">Branch Management</h1>
          <p className="text-admin-400 text-xs font-admin mt-0.5">
            {branches.filter(b => b.isActive).length} active · {branches.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchBranches}
            className="p-2 rounded-lg bg-white border border-admin-200 text-admin-400
              hover:text-admin-700 hover:bg-admin-50 transition-colors shadow-admin">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setModal({ type: 'create' })}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl
              text-sm font-admin font-semibold hover:bg-brand-600 transition-colors shadow-admin">
            <Plus size={16} /> Create Branch
          </button>
        </div>
      </div>

      {/* Show inactive toggle */}
      {branches.some(b => !b.isActive) && (
        <label className="flex items-center gap-2 mb-4 cursor-pointer w-fit">
          <div
            onClick={() => setShowInactive(v => !v)}
            className={`relative w-9 h-5 rounded-full transition-all cursor-pointer ${
              showInactive ? 'bg-admin-500' : 'bg-admin-200'
            }`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm
              transition-transform ${showInactive ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-xs font-admin text-admin-600">Show inactive branches</span>
        </label>
      )}

      {/* Branch cards */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-admin-200 shadow-admin py-16 text-center">
          <GitBranch size={32} className="text-admin-300 mx-auto mb-3" />
          <p className="text-admin-600 font-admin font-semibold mb-1">No branches yet</p>
          <p className="text-admin-400 text-sm font-admin mb-4">Create your first branch to get started</p>
          <button onClick={() => setModal({ type: 'create' })}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white
              rounded-xl text-sm font-admin font-semibold hover:bg-brand-600 transition-colors">
            <Plus size={15} /> Create Branch
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(branch => (
            <div key={branch._id}
              className={`bg-white rounded-xl border shadow-admin overflow-hidden transition-all ${
                branch.isActive ? 'border-admin-200' : 'border-admin-100 opacity-70'
              }`}>
              <div className="flex items-center gap-4 px-5 py-4">

                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  branch.isDefault ? 'bg-brand-50 border border-brand-100' : 'bg-admin-100'
                }`}>
                  <GitBranch size={18} className={branch.isDefault ? 'text-brand-600' : 'text-admin-500'} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-admin font-bold text-admin-900">{branch.name}</p>
                    <StatusBadge isActive={branch.isActive} isDefault={branch.isDefault} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {branch.location && (
                      <span className="text-xs text-admin-400 font-admin flex items-center gap-1">
                        <MapPin size={10} /> {branch.location}
                      </span>
                    )}
                    {branch.phone && (
                      <span className="text-xs text-admin-400 font-admin flex items-center gap-1">
                        <Phone size={10} /> {branch.phone}
                      </span>
                    )}
                    <span className="text-xs text-admin-400 font-admin flex items-center gap-1">
                      <Globe size={10} /> /{branch.slug}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setModal({ type: 'staff', branch })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-admin
                      font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 transition-all"
                    title="View & manage staff">
                    <Users size={13} /> Staff
                  </button>
                  <button
                    onClick={() => setModal({ type: 'edit', branch })}
                    className="p-1.5 rounded-lg hover:bg-admin-100 text-admin-400 hover:text-admin-700 transition-colors"
                    title="Edit branch">
                    <Edit size={15} />
                  </button>
                  {branch.isActive && !branch.isDefault && (
                    confirmDeactivate === branch._id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-admin-500 font-admin flex items-center gap-1">
                          <AlertTriangle size={11} className="text-amber-500" />Sure?
                        </span>
                        <button onClick={() => handleDeactivate(branch)}
                          className="px-2 py-1 bg-red-600 text-white rounded-lg text-xs font-admin
                            font-semibold hover:bg-red-700 transition-colors">
                          Yes
                        </button>
                        <button onClick={() => setConfirmDeactivate(null)}
                          className="px-2 py-1 border border-admin-200 text-admin-500 rounded-lg
                            text-xs font-admin hover:bg-admin-50 transition-colors">
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeactivate(branch._id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-admin-400 hover:text-red-600 transition-colors"
                        title="Deactivate branch">
                        <Trash2 size={15} />
                      </button>
                    )
                  )}
                  {!branch.isActive && (
                    <button
                      onClick={() => handleReactivate(branch)}
                      className="p-1.5 rounded-lg hover:bg-green-50 text-admin-400 hover:text-green-600 transition-colors"
                      title="Reactivate branch">
                      <CheckCircle size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {modal?.type === 'create' && (
        <BranchModal onClose={() => setModal(null)} onSaved={fetchBranches} />
      )}
      {modal?.type === 'edit' && (
        <BranchModal branch={modal.branch} onClose={() => setModal(null)} onSaved={fetchBranches} />
      )}
      {modal?.type === 'staff' && (
        <StaffModal branch={modal.branch} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
