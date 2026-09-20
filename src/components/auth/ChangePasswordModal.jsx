import { useState } from 'react'
import { Eye, EyeOff, Lock, X, CheckCircle } from 'lucide-react'
import { Field, Input } from '../ui/Field'
import Modal from '../ui/Modal'
import { authService } from '../../services/auth.service'

// ── PASSWORD STRENGTH ─────────────────────────────────────────────────────────
const getStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak',   color: 'bg-red-400'   }
  if (score <= 3) return { score, label: 'Fair',   color: 'bg-amber-400' }
  return              { score, label: 'Strong', color: 'bg-green-500'  }
}

// Requires an authenticated session — /auth/change-password verifies the JWT.
// Only render this for logged-in users (e.g. from the profile page).
export default function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [show, setShow] = useState({ current: false, next: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  const strength = getStrength(form.next)
  const toggle   = (field) => setShow(s => ({ ...s, [field]: !s[field] }))

  // Escape handling now lives in <Modal> (document-level listener + focus trap).

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    // Mirrors the backend password policy (min 8 + uppercase + number) so the
    // user gets an inline error instead of a server round-trip rejection.
    if (form.next.length < 8)       return setError('New password must be at least 8 characters')
    if (!/[A-Z]/.test(form.next))   return setError('New password must contain at least one uppercase letter')
    if (!/[0-9]/.test(form.next))   return setError('New password must contain at least one number')
    if (form.next !== form.confirm) return setError('Passwords do not match')
    if (form.current === form.next) return setError('New password must be different from current')
    setLoading(true)
    try {
      await authService.changePassword(form.current, form.next)
      setDone(true)
      setTimeout(onClose, 2500)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password. Check your current password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      labelledBy="change-password-title"
      panelClassName="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-earth-200"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-earth-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
            <Lock size={15} className="text-brand-600" aria-hidden="true" />
          </div>
          <h3 id="change-password-title" className="font-display font-semibold text-earth-900">Change Password</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Close"
          className="p-2 -m-1 rounded-lg hover:bg-earth-100 text-earth-400 hover:text-earth-800 transition-colors">
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="p-5 overflow-y-auto">
          {done ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <p className="font-display font-semibold text-earth-900 mb-1">Password Updated</p>
              <p className="text-earth-500 text-sm font-body">Your password has been changed successfully</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { key: 'current', label: 'Current Password',     placeholder: 'Your current password', autoFocus: true },
                { key: 'next',    label: 'New Password',         placeholder: '8+ chars, 1 uppercase, 1 number' },
                { key: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password'    },
              ].map(({ key, label, placeholder, autoFocus }) => (
                <Field
                  key={key}
                  label={label}
                  required
                  error={
                    key === 'confirm' && form.confirm && form.next !== form.confirm
                      ? 'Passwords do not match'
                      : undefined
                  }
                >
                  <div className="relative">
                    <Input
                      type={show[key] ? 'text' : 'password'}
                      value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      required
                      autoFocus={autoFocus}
                      autoComplete={key === 'current' ? 'current-password' : 'new-password'}
                      className={`pr-12 ${
                        key === 'confirm' && form.confirm && form.next === form.confirm
                          ? 'border-green-300 focus:ring-green-300'
                          : ''
                      }`}
                    />
                    <button type="button" onClick={() => toggle(key)}
                      aria-label={show[key] ? 'Hide password' : 'Show password'}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-2 min-w-[40px] min-h-[40px]
                        flex items-center justify-center rounded-lg text-earth-400 hover:text-earth-700
                        transition-colors">
                      {show[key] ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                    </button>
                  </div>
                  {key === 'next' && form.next && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                            i <= strength.score ? strength.color : 'bg-earth-200'
                          }`} />
                        ))}
                      </div>
                      <p className={`text-xs font-body ${
                        strength.score <= 1 ? 'text-red-500' :
                        strength.score <= 3 ? 'text-amber-500' : 'text-green-600'
                      }`}>Password strength: {strength.label}</p>
                    </div>
                  )}
                  {key === 'confirm' && form.confirm && form.next === form.confirm && form.next.length >= 8 && (
                    <p className="text-green-600 text-xs mt-1 font-body flex items-center gap-1">
                      <CheckCircle size={11} aria-hidden="true" /> Passwords match
                    </p>
                  )}
                </Field>
              ))}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-body">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 text-white
                  rounded-xl text-sm font-body font-semibold hover:bg-brand-700 transition-all
                  disabled:opacity-60 active:scale-[0.98]">
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Updating…</>
                  : <><Lock size={15} aria-hidden="true" /> Update Password</>
                }
              </button>
            </form>
          )}
      </div>
    </Modal>
  )
}
