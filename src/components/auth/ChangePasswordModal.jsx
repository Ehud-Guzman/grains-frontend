import { useEffect, useState } from 'react'
import { Eye, EyeOff, Lock, X, CheckCircle } from 'lucide-react'
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

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-label="Change password"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-earth-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-earth-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <Lock size={15} className="text-brand-600" />
            </div>
            <h3 className="font-display font-semibold text-earth-900">Change Password</h3>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-earth-100 text-earth-400 hover:text-earth-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
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
                <div key={key}>
                  <label className="block text-xs font-body font-semibold text-earth-700 uppercase tracking-wide mb-1.5">
                    {label}
                  </label>
                  <div className="relative">
                    <input
                      type={show[key] ? 'text' : 'password'}
                      value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      required
                      autoFocus={autoFocus}
                      autoComplete={key === 'current' ? 'current-password' : 'new-password'}
                      className={`w-full border rounded-xl px-4 py-2.5 pr-10 text-sm font-body
                        text-earth-900 placeholder-earth-400 focus:outline-none focus:ring-2
                        focus:border-transparent bg-white transition-colors ${
                          key === 'confirm' && form.confirm
                            ? form.next !== form.confirm ? 'border-red-300 focus:ring-red-300'
                            : 'border-green-300 focus:ring-green-300'
                            : 'border-earth-200 focus:ring-brand-400'
                        }`}
                    />
                    <button type="button" onClick={() => toggle(key)}
                      aria-label={show[key] ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-earth-400 hover:text-earth-700 p-0.5">
                      {show[key] ? <EyeOff size={16} /> : <Eye size={16} />}
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
                      }`}>{strength.label}</p>
                    </div>
                  )}
                  {key === 'confirm' && form.confirm && (
                    form.next !== form.confirm
                      ? <p className="text-red-500 text-xs mt-1 font-body">Passwords do not match</p>
                      : form.next.length >= 8
                        ? <p className="text-green-600 text-xs mt-1 font-body flex items-center gap-1">
                            <CheckCircle size={11} /> Passwords match
                          </p>
                        : null
                  )}
                </div>
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
                  : <><Lock size={15} /> Update Password</>
                }
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
