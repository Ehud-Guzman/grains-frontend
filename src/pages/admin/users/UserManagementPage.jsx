import { useState, useEffect } from 'react'
import { Plus, Lock, Unlock, Edit, Key, Shield, UserCog, X, Eye, EyeOff } from 'lucide-react'
import { adminUserService } from '../../../services/admin/user.service'
import { formatDate } from '../../../utils/helpers'
import Spinner from '../../../components/ui/Spinner'
import toast from 'react-hot-toast'

const ROLES = ['staff', 'supervisor', 'admin', 'superadmin']

const ROLE_CONFIG = {
  staff:      { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
  supervisor: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  admin:      { bg: 'bg-brand-50',  text: 'text-brand-700',  border: 'border-brand-200'  },
  superadmin: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'    },
}

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.staff
  return (
    <span className={`inline-flex items-center text-xs font-admin font-semibold
      px-2.5 py-1 rounded-full border capitalize ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      {role}
    </span>
  )
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function Modal({ modal, onClose, onSave }) {
  const [form, setForm] = useState(modal.form || {})
  const [saving, setSaving] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(form)
    } finally { setSaving(false) }
  }

  const fieldClass = `w-full border border-admin-200 rounded-xl px-3.5 py-2.5 text-sm
    font-admin text-admin-800 placeholder-admin-400 focus:outline-none focus:ring-2
    focus:ring-brand-400 focus:border-transparent bg-admin-50 transition-all`

  const titles = {
    create: 'Create Admin Account',
    role: `Change Role — ${modal.user?.name}`,
    password: `Reset Password — ${modal.user?.name}`,
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-admin-lg border border-admin-100">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-admin-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              {modal.type === 'create' ? <UserCog size={15} className="text-brand-600" />
               : modal.type === 'role' ? <Shield size={15} className="text-brand-600" />
               : <Key size={15} className="text-brand-600" />}
            </div>
            <h3 className="font-admin font-bold text-admin-900 text-sm">{titles[modal.type]}</h3>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-admin-100 text-admin-400 hover:text-admin-600 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {modal.type === 'create' && (
            <>
              {[
                { key: 'name',  label: 'Full Name',          type: 'text',     ph: 'Jane Staff'       },
                { key: 'phone', label: 'Phone Number',        type: 'tel',      ph: '0712 345 678'     },
                { key: 'email', label: 'Email (optional)',    type: 'email',    ph: 'jane@example.com' },
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

              <div>
                <label className="block text-xs font-admin font-semibold text-admin-600 uppercase tracking-wide mb-1.5">Role</label>
                <select value={form.role || 'staff'} onChange={e => set('role', e.target.value)}
                  className={fieldClass}>
                  {ROLES.filter(r => r !== 'superadmin').map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {modal.type === 'role' && (
            <>
              <p className="text-sm font-admin text-admin-500">
                Current role: <RoleBadge role={modal.user?.role} />
              </p>
              <div>
                <label className="block text-xs font-admin font-semibold text-admin-600 uppercase tracking-wide mb-1.5">
                  New Role
                </label>
                <select value={form.role} onChange={e => set('role', e.target.value)}
                  className={fieldClass}>
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
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
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 bg-brand-500 text-white rounded-xl text-sm font-admin
              font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save Changes'}
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

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function UserManagementPage() {
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await adminUserService.getAll()
      setUsers(res.data.data || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleSave = async (form) => {
    try {
      if (modal.type === 'create') {
        await adminUserService.create(form)
        toast.success('Account created')
      } else if (modal.type === 'role') {
        await adminUserService.changeRole(modal.user._id, form.role)
        toast.success(`Role updated to ${form.role}`)
      } else if (modal.type === 'password') {
        await adminUserService.resetPassword(modal.user._id, form.password)
        toast.success('Password reset')
      }
      setModal(null)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
      throw err
    }
  }

  const handleLock = async (user) => {
    try {
      if (user.isLocked) {
        await adminUserService.unlock(user._id)
        toast.success(`${user.name} unlocked`)
      } else {
        await adminUserService.lock(user._id)
        toast.success(`${user.name} locked`)
      }
      fetchUsers()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-admin font-bold text-admin-900">User Management</h1>
          <p className="text-admin-400 text-xs font-admin mt-0.5">{users.length} admin account{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal({ type: 'create', form: { role: 'staff' } })}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl
            text-sm font-admin font-semibold hover:bg-brand-600 transition-colors shadow-admin">
          <Plus size={16} /> Create Account
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-admin-200 shadow-admin overflow-hidden">
          <table className="w-full text-sm font-admin">
            <thead>
              <tr className="border-b border-admin-100 bg-admin-50/60">
                {['Name', 'Phone', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className={`px-5 py-3.5 text-left text-xs text-admin-500 font-semibold
                    uppercase tracking-wide ${['Phone', 'Last Login'].includes(h) ? 'hidden sm:table-cell' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-50">
              {users.map(user => (
                <tr key={user._id} className="hover:bg-admin-50/60 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-700 text-xs font-bold">{user.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-admin font-semibold text-admin-800">{user.name}</p>
                        {user.email && <p className="text-admin-400 text-xs">{user.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-admin-600 hidden sm:table-cell font-admin">{user.phone}</td>
                  <td className="px-5 py-4"><RoleBadge role={user.role} /></td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-admin font-semibold
                      px-2.5 py-1 rounded-full border ${
                        user.isLocked
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.isLocked ? 'bg-red-400' : 'bg-green-400'}`} />
                      {user.isLocked ? 'Locked' : 'Active'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-admin-400 text-xs hidden sm:table-cell">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setModal({ type: 'role', user, form: { role: user.role } })}
                        className="p-1.5 rounded-lg hover:bg-admin-100 text-admin-400 hover:text-admin-700 transition-colors"
                        title="Change role">
                        <Edit size={15} />
                      </button>
                      <button onClick={() => setModal({ type: 'password', user, form: {} })}
                        className="p-1.5 rounded-lg hover:bg-admin-100 text-admin-400 hover:text-admin-700 transition-colors"
                        title="Reset password">
                        <Key size={15} />
                      </button>
                      <button onClick={() => handleLock(user)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          user.isLocked
                            ? 'hover:bg-green-50 text-admin-400 hover:text-green-600'
                            : 'hover:bg-red-50 text-admin-400 hover:text-red-600'
                        }`}
                        title={user.isLocked ? 'Unlock account' : 'Lock account'}>
                        {user.isLocked ? <Unlock size={15} /> : <Lock size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && users.length === 0 && (
            <div className="py-16 text-center">
              <UserCog size={28} className="text-admin-300 mx-auto mb-3" />
              <p className="text-admin-500 font-admin font-medium">No admin accounts found</p>
            </div>
          )}
        </div>
      )}

      {modal && (
        <Modal modal={modal} onClose={() => setModal(null)} onSave={handleSave} />
      )}
    </div>
  )
}