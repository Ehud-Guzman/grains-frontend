import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, Lock, X, ArrowLeft, CheckCircle, MapPin, Building2, ShoppingBag, Shield } from 'lucide-react'
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
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const strength = getStrength(form.next)

  const toggle = (field) => setShow(s => ({ ...s, [field]: !s[field] }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.next.length < 8) return setError('New password must be at least 8 characters')
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-warm-lg w-full max-w-sm border border-earth-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-earth-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
              <Lock size={15} className="text-brand-700" />
            </div>
            <h3 className="font-display font-semibold text-earth-900">Change Password</h3>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-earth-200 text-earth-500 hover:text-earth-800 transition-colors">
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
              <p className="text-earth-600 text-sm font-body">Your password has been changed successfully</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Current password */}
              <div>
                <label className="block text-xs font-body font-semibold text-earth-800 uppercase tracking-wide mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={show.current ? 'text' : 'password'}
                    value={form.current}
                    onChange={e => setForm(f => ({ ...f, current: e.target.value }))}
                    placeholder="Your current password"
                    required
                    autoFocus
                    className="w-full border border-earth-300 rounded-xl px-4 py-2.5 pr-10 text-sm
                      font-body text-earth-900 placeholder-earth-400 focus:outline-none
                      focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white"
                  />
                  <button type="button" onClick={() => toggle('current')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-earth-400 hover:text-earth-700 p-0.5">
                    {show.current ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-xs font-body font-semibold text-earth-800 uppercase tracking-wide mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={show.next ? 'text' : 'password'}
                    value={form.next}
                    onChange={e => setForm(f => ({ ...f, next: e.target.value }))}
                    placeholder="At least 8 characters"
                    required
                    className="w-full border border-earth-300 rounded-xl px-4 py-2.5 pr-10 text-sm
                      font-body text-earth-900 placeholder-earth-400 focus:outline-none
                      focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white"
                  />
                  <button type="button" onClick={() => toggle('next')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-earth-400 hover:text-earth-700 p-0.5">
                    {show.next ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Strength meter */}
                {form.next && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            i <= strength.score ? strength.color : 'bg-earth-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-body ${
                      strength.score <= 1 ? 'text-red-500' :
                      strength.score <= 3 ? 'text-amber-500' : 'text-green-600'
                    }`}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-body font-semibold text-earth-800 uppercase tracking-wide mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={show.confirm ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                    placeholder="Repeat new password"
                    required
                    className={`w-full border rounded-xl px-4 py-2.5 pr-10 text-sm font-body
                      text-earth-900 placeholder-earth-400 focus:outline-none
                      focus:ring-2 focus:border-transparent bg-white transition-colors ${
                        form.confirm && form.next !== form.confirm
                          ? 'border-red-300 focus:ring-red-300'
                          : form.confirm && form.next === form.confirm
                          ? 'border-green-300 focus:ring-green-300'
                          : 'border-earth-300 focus:ring-brand-400'
                      }`}
                  />
                  <button type="button" onClick={() => toggle('confirm')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-earth-400 hover:text-earth-700 p-0.5">
                    {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.confirm && form.next !== form.confirm && (
                  <p className="text-red-500 text-xs mt-1 font-body">Passwords do not match</p>
                )}
                {form.confirm && form.next === form.confirm && form.next.length >= 8 && (
                  <p className="text-green-600 text-xs mt-1 font-body flex items-center gap-1">
                    <CheckCircle size={11} /> Passwords match
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-body">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-700 text-white
                  rounded-xl text-sm font-body font-semibold hover:bg-brand-800 transition-all
                  disabled:opacity-60 active:scale-[0.98]">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Updating…</>
                ) : (
                  <><Lock size={15} /> Update Password</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ── BRANCH SELECTOR STEP ─────────────────────────────────────────────────────
function BranchSelector({ branches, preAuthToken, pendingUser, onSelect, onBack }) {
  const [selected, setSelected] = useState(branches.length === 1 ? branches[0]._id : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    <div className="bg-white rounded-2xl shadow-warm-lg border border-earth-200 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center">
          <Building2 size={16} className="text-brand-700" />
        </div>
        <div>
          <p className="font-display font-semibold text-earth-900 text-sm">Select Branch</p>
          <p className="text-earth-600 text-xs font-body">Welcome, {pendingUser?.name}</p>
        </div>
      </div>

      <div className="space-y-2 mb-5">
        {branches.map(branch => (
          <button
            key={branch._id}
            type="button"
            onClick={() => setSelected(branch._id)}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
              selected === branch._id
                ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-300'
                : 'border-earth-200 hover:border-earth-300 bg-earth-100'
            }`}
          >
            <p className="font-body font-semibold text-earth-900 text-sm">{branch.name}</p>
            {branch.location && (
              <p className="text-earth-600 text-xs font-body flex items-center gap-1 mt-0.5">
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

      <button
        type="button"
        onClick={handleSelect}
        disabled={loading || !selected}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-700
          text-white rounded-xl text-sm font-body font-semibold hover:bg-brand-800
          transition-all active:scale-[0.98] disabled:opacity-60 shadow-warm"
      >
        {loading ? (
          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Entering…</>
        ) : (
          <><LogIn size={17} /> Continue</>
        )}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="w-full mt-3 text-center text-sm text-earth-600 hover:text-earth-900 font-body transition-colors"
      >
        ← Back to login
      </button>
    </div>
  )
}

export default function LoginPage() {
  const shopInfo = useShopInfo()
  const { login, selectBranch } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const from = location.state?.from?.pathname || '/dashboard'

  // Step 1: credentials
  const [form, setForm] = useState({ phone: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showChangePassword, setShowChangePassword] = useState(false)

  // Step 2: branch selection (admin only)
  const [branchStep, setBranchStep] = useState(null)

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

      const userData = result.user
      if (ADMIN_ROLES.includes(userData.role)) {
        navigate('/admin/dashboard', { replace: true })
      } else if (userData.role === 'driver') {
        navigate('/driver/dashboard', { replace: true })
      } else {
        const customerTarget = ['/login', '/register', '/'].includes(from) ? '/dashboard' : from
        navigate(customerTarget, { replace: true })
      }
    } catch (err) {
      setLoading(false)
      if (err.response?.status === 423) {
        setError('Your account is locked. Please contact support.')
      } else if (err.response?.status === 401) {
        setError('Invalid phone number or password.')
      } else {
        setError(err.response?.data?.message || 'Login failed. Please try again.')
      }
    }
  }

  const handleBranchSelect = async (preAuthToken, branchId) => {
    await selectBranch(preAuthToken, branchId)
    navigate('/admin/dashboard', { replace: true })
  }

  return (
    <>
      {/* ── Page: warm off-white background ─────────────────────────────────── */}
      <div className="min-h-screen bg-[#F5F2EF] flex flex-col">

        {/* ── Top nav strip ─────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-earth-200 py-3 px-4">
          <div className="max-w-sm mx-auto flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-body font-medium
                text-earth-600 hover:text-brand-700 transition-colors"
            >
              <ArrowLeft size={15} />
              <span>Back to {shopInfo.name}</span>
            </Link>
            <span className="flex items-center gap-1.5 text-xs font-body text-earth-500">
              <Shield size={12} className="text-brand-600" />
              Secure Login
            </span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm">

            {/* ── Brand header ─────────────────────────────────────────────── */}
            <div className="text-center mb-8">
              {/* Logo badge — terracotta gradient */}
              <div className="w-20 h-20 rounded-2xl mx-auto mb-5 shadow-warm-lg overflow-hidden
                bg-gradient-to-br from-brand-500 to-brand-800 flex items-center justify-center">
                <img
                  src="/Vittorios-logo.jpeg"
                  alt="Vittorios"
                  className="w-full h-full object-cover"
                  onError={e => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
                <div className="w-full h-full items-center justify-center hidden">
                  <span className="text-white font-display font-bold text-3xl">V</span>
                </div>
              </div>

              {branchStep ? (
                <>
                  <h1 className="font-display text-2xl font-bold text-earth-900">Choose Branch</h1>
                  <p className="text-earth-600 text-sm mt-1 font-body">Select the branch you're working at</p>
                </>
              ) : (
                <>
                  <h1 className="font-display text-2xl font-bold text-earth-900">Welcome back</h1>
                  <p className="text-earth-600 text-sm mt-1 font-body">{shopInfo.name}</p>
                </>
              )}
            </div>

            {/* ── Branch selection step ─────────────────────────────────────── */}
            {branchStep && (
              <BranchSelector
                branches={branchStep.branches}
                preAuthToken={branchStep.preAuthToken}
                pendingUser={branchStep.user}
                onSelect={handleBranchSelect}
                onBack={() => setBranchStep(null)}
              />
            )}

            {/* ── Credentials card ──────────────────────────────────────────── */}
            {!branchStep && (
              <div className="bg-white rounded-2xl shadow-warm-lg border border-earth-200 overflow-hidden">
                {/* Premium top accent */}
                <div className="h-1 bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400" />

                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">

                    <div>
                      <label className="block text-xs font-body font-semibold text-earth-800
                        uppercase tracking-wide mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="0712 345 678"
                        className="w-full border border-earth-300 rounded-xl px-4 py-3 text-sm font-body
                          text-earth-900 placeholder-earth-400 focus:outline-none focus:ring-2
                          focus:ring-brand-400 focus:border-transparent bg-white transition-all"
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-body font-semibold text-earth-800 uppercase tracking-wide">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowChangePassword(true)}
                          className="text-xs text-brand-600 hover:text-brand-800 font-body font-medium transition-colors"
                        >
                          Change password
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPass ? 'text' : 'password'}
                          value={form.password}
                          onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                          placeholder="Your password"
                          className="w-full border border-earth-300 rounded-xl px-4 py-3 pr-12 text-sm
                            font-body text-earth-900 placeholder-earth-400 focus:outline-none
                            focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white transition-all"
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
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-sm
                        text-red-700 font-body">
                        {error}
                      </div>
                    )}

                    <button type="submit" disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-700
                        text-white rounded-xl text-sm font-body font-semibold hover:bg-brand-800
                        transition-all active:scale-[0.98] disabled:opacity-60 shadow-warm mt-2">
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Signing in…
                        </>
                      ) : (
                        <>
                          <LogIn size={17} />
                          Sign In
                        </>
                      )}
                    </button>
                  </form>

                  <div className="border-t border-earth-200 mt-5 pt-5 text-center">
                    <p className="text-sm text-earth-600 font-body">
                      Don't have an account?{' '}
                      <Link to="/register" className="text-brand-700 hover:text-brand-900 font-semibold transition-colors">
                        Create one
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Continue browsing ─────────────────────────────────────────── */}
            {!branchStep && (
              <div className="mt-4">
                <Link
                  to="/shop"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-earth-200
                    bg-white px-4 py-3 text-sm font-body font-medium text-earth-700 shadow-warm
                    hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-all"
                >
                  <ShoppingBag size={16} />
                  <span>Continue Browsing</span>
                </Link>
              </div>
            )}

            {/* ── Trust badge ───────────────────────────────────────────────── */}
            {!branchStep && (
              <p className="text-center text-xs text-earth-500 font-body mt-5 flex items-center justify-center gap-1.5">
                <Shield size={11} className="text-brand-500" />
                Your data is safe and encrypted
              </p>
            )}

          </div>
        </div>
      </div>

      {/* Change password modal */}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </>
  )
}
