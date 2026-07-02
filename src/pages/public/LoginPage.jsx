import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Eye, EyeOff, LogIn, Lock, X, ArrowLeft,
  CheckCircle, MapPin, Building2, ShoppingBag, Shield,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useShopInfo } from '../../context/AppSettingsContext'
import { authService } from '../../services/auth.service'

const ADMIN_ROLES = ['admin', 'superadmin', 'supervisor', 'staff']

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

// ── CHANGE PASSWORD MODAL ─────────────────────────────────────────────────────
function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [show, setShow] = useState({ current: false, next: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  const strength = getStrength(form.next)
  const toggle   = (field) => setShow(s => ({ ...s, [field]: !s[field] }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.next.length < 8)      return setError('New password must be at least 8 characters')
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-earth-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-earth-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <Lock size={15} className="text-brand-600" />
            </div>
            <h3 className="font-display font-semibold text-earth-900">Change Password</h3>
          </div>
          <button onClick={onClose}
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
                { key: 'current', label: 'Current Password',    placeholder: 'Your current password', autoFocus: true },
                { key: 'next',    label: 'New Password',         placeholder: 'At least 8 characters'  },
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

// ── BRANCH SELECTOR ───────────────────────────────────────────────────────────
function BranchSelector({ branches, preAuthToken, pendingUser, onSelect, onBack }) {
  const [selected, setSelected] = useState(branches.length === 1 ? branches[0]._id : '')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSelect = async () => {
    if (!selected) return setError('Please select a branch')
    setError('')
    setLoading(true)
    try {
      await onSelect(preAuthToken, selected)
    } catch (err) {
      setLoading(false)
      setError(err.response?.data?.message || 'Failed to select branch. Please try again.')
    }
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden"
      style={{ boxShadow: '0 25px 60px rgba(15,10,5,0.45)' }}>
      <div className="h-1.5 bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400" />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-brand-50 border border-brand-200 rounded-xl flex items-center justify-center">
            <Building2 size={16} className="text-brand-600" />
          </div>
          <div>
            <p className="font-body font-semibold text-earth-900 text-sm">Select your branch</p>
            <p className="text-earth-500 text-xs font-body">Welcome, {pendingUser?.name}</p>
          </div>
        </div>

        <div className="space-y-2 mb-5">
          {branches.map(branch => (
            <button key={branch._id} type="button" onClick={() => setSelected(branch._id)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                selected === branch._id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-earth-200 hover:border-earth-300 bg-white'
              }`}>
              <p className="font-body font-semibold text-earth-900 text-sm">{branch.name}</p>
              {branch.location && (
                <p className="text-earth-500 text-xs font-body flex items-center gap-1 mt-0.5">
                  <MapPin size={10} /> {branch.location}
                </p>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-body mb-4">
            {error}
          </div>
        )}

        <button type="button" onClick={handleSelect} disabled={loading || !selected}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-600 text-white
            rounded-xl text-sm font-body font-semibold hover:bg-brand-700 transition-all
            active:scale-[0.98] disabled:opacity-60">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Entering…</>
            : <><LogIn size={17} /> Continue to Dashboard</>
          }
        </button>

        <button type="button" onClick={onBack}
          className="w-full mt-3 flex items-center justify-center gap-1.5 text-sm
            text-earth-500 hover:text-earth-800 font-body transition-colors py-1.5">
          <ArrowLeft size={14} />
          Back to login
        </button>
      </div>
    </div>
  )
}

// ── LOGIN PAGE ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const shopInfo = useShopInfo()
  const { login, selectBranch } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const from = location.state?.from?.pathname || '/dashboard'

  const [form, setForm]                           = useState({ phone: '', password: '' })
  const [showPass, setShowPass]                   = useState(false)
  const [loading, setLoading]                     = useState(false)
  const [error, setError]                         = useState('')
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [branchStep, setBranchStep]               = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(form.phone, form.password)
      if (result.requiresBranchSelection) {
        setLoading(false)
        setBranchStep({ preAuthToken: result.preAuthToken, branches: result.branches, user: result.user })
        return
      }
      const { role } = result.user
      if (ADMIN_ROLES.includes(role))  navigate('/admin/dashboard',  { replace: true })
      else if (role === 'driver')      navigate('/driver/dashboard', { replace: true })
      else {
        const target = ['/login', '/register', '/'].includes(from) ? '/dashboard' : from
        navigate(target, { replace: true })
      }
    } catch (err) {
      setLoading(false)
      if (err.response?.status === 423)      setError('Your account is locked. Please contact support.')
      else if (err.response?.status === 401) setError('Invalid phone number or password.')
      else                                   setError(err.response?.data?.message || 'Login failed. Please try again.')
    }
  }

  const handleBranchSelect = async (preAuthToken, branchId) => {
    await selectBranch(preAuthToken, branchId)
    navigate('/admin/dashboard', { replace: true })
  }

  return (
    <>
      {/* Full-screen container */}
      <div className="min-h-screen relative flex flex-col">

        {/* Background image */}
        <img
          src="/wheat-1188x792-1024x683.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Warm overlay — darkens sky, keeps wheat glowing */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/70 via-brand-900/50 to-brand-900/75" />

        {/* Top bar — back link + secure badge */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full
              bg-white/10 backdrop-blur-md border border-white/20 text-sm font-body
              font-medium text-white/80 hover:text-white hover:bg-white/20
              transition-all duration-200 group"
          >
            <ArrowLeft size={14} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
            Home
          </Link>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
            bg-white/10 backdrop-blur-md border border-white/15 text-xs font-body text-white/60">
            <Shield size={11} className="text-brand-300" />
            Secure Login
          </span>
        </div>

        {/* Center — floating form */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm">

            {/* Branch selection */}
            {branchStep && (
              <BranchSelector
                branches={branchStep.branches}
                preAuthToken={branchStep.preAuthToken}
                pendingUser={branchStep.user}
                onSelect={handleBranchSelect}
                onBack={() => setBranchStep(null)}
              />
            )}

            {/* Login card — self-contained */}
            {!branchStep && (
              <div
                className="rounded-2xl overflow-hidden border border-white/25"
                style={{
                  background: 'rgba(255,255,255,0.91)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  boxShadow: '0 32px 64px rgba(10,6,2,0.50), 0 0 0 1px rgba(255,255,255,0.12)',
                }}
              >
                {/* Top accent */}
                <div className="h-1 bg-gradient-to-r from-brand-700 via-brand-500 to-brand-400" />

                {/* Logo + heading — inside the card */}
                <div className="pt-7 pb-5 px-7 text-center border-b border-earth-100">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-4 overflow-hidden
                    ring-2 ring-earth-100 shadow-sm">
                    <img src="/Vittorios-logo.jpeg" alt="Vittorios" className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                    <div className="w-full h-full bg-brand-700 items-center justify-center hidden">
                      <span className="text-white font-display font-bold text-xl">V</span>
                    </div>
                  </div>
                  <h1 className="font-display text-xl font-bold text-earth-900 leading-tight">Welcome back</h1>
                  <p className="text-earth-500 text-sm mt-0.5 font-body">{shopInfo.name}</p>
                </div>

                <div className="px-7 pt-5 pb-7">
                  <form onSubmit={handleSubmit} className="space-y-5">

                    <div>
                      <label className="block text-sm font-body font-medium text-earth-700 mb-2">
                        Phone number
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="0712 345 678"
                        autoComplete="tel"
                        className="w-full border border-earth-200 rounded-xl px-4 py-3 text-sm font-body
                          text-earth-900 placeholder-earth-400 focus:outline-none focus:ring-2
                          focus:ring-brand-500 focus:border-transparent bg-white/70 transition-all"
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-body font-medium text-earth-700">
                          Password
                        </label>
                        <button type="button" onClick={() => setShowChangePassword(true)}
                          className="text-xs text-brand-600 hover:text-brand-800 font-body font-medium transition-colors">
                          Change password
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPass ? 'text' : 'password'}
                          value={form.password}
                          onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                          placeholder="Your password"
                          autoComplete="current-password"
                          className="w-full border border-earth-200 rounded-xl px-4 py-3 pr-12 text-sm
                            font-body text-earth-900 placeholder-earth-400 focus:outline-none
                            focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white/70 transition-all"
                          required
                        />
                        <button type="button" onClick={() => setShowPass(s => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-earth-400
                            hover:text-earth-700 p-1 transition-colors">
                          {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-sm text-red-700 font-body">
                        {error}
                      </div>
                    )}

                    <button type="submit" disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-600
                        text-white rounded-xl text-sm font-body font-semibold hover:bg-brand-700
                        transition-all active:scale-[0.98] disabled:opacity-60"
                      style={{ boxShadow: '0 4px 16px rgba(163,78,34,0.35)' }}>
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Signing in…
                        </>
                      ) : (
                        <><LogIn size={17} /> Sign In</>
                      )}
                    </button>
                  </form>

                  {/* Footer */}
                  <div className="mt-5 pt-4 border-t border-earth-100 text-center space-y-2">
                    <p className="text-sm text-earth-600 font-body">
                      No account?{' '}
                      <Link to="/register"
                        className="text-brand-600 hover:text-brand-800 font-semibold transition-colors">
                        Create one
                      </Link>
                      {' · '}
                      <Link to="/shop"
                        className="text-earth-500 hover:text-brand-700 transition-colors inline-flex items-center gap-1">
                        <ShoppingBag size={12} />
                        Browse
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom branding */}
        <div className="relative z-10 pb-6 text-center">
          <p className="text-white/30 text-xs font-body">
            Vittorios Grains &amp; Cereals · Bungoma, Kenya
          </p>
        </div>

      </div>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </>
  )
}
