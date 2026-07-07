import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Eye, EyeOff, LogIn, ArrowLeft, Clock,
  MapPin, Building2, ShoppingBag, Shield,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useShopInfo } from '../../context/AppSettingsContext'
import { normalizeKenyanPhone } from '../../utils/helpers'

const ADMIN_ROLES = ['admin', 'superadmin', 'supervisor', 'staff']

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
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-brand-50 border border-brand-200 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-brand-600" />
          </div>
          <div>
            <p className="font-body font-semibold text-earth-900 text-sm">Select your branch</p>
            <p className="text-earth-500 text-xs font-body">Welcome, {pendingUser?.name}</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {branches.map(branch => (
            <button key={branch._id} type="button" onClick={() => setSelected(branch._id)}
              className={`w-full text-left px-4 py-2.5 rounded-xl border-2 transition-all ${
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
          <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-sm text-red-700 font-body mb-3">
            {error}
          </div>
        )}

        <button type="button" onClick={handleSelect} disabled={loading || !selected}
          className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 text-white
            rounded-xl text-sm font-body font-semibold hover:bg-brand-700 transition-all
            active:scale-[0.98] disabled:opacity-60">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Entering…</>
            : <><LogIn size={17} /> Continue to Dashboard</>
          }
        </button>

        <button type="button" onClick={onBack}
          className="w-full mt-2 flex items-center justify-center gap-1.5 text-sm
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
  const [searchParams] = useSearchParams()
  const from = location.state?.from?.pathname || '/dashboard'
  const signedOutForInactivity = searchParams.get('reason') === 'inactivity'

  const [form, setForm]             = useState({ phone: '', password: '' })
  const [showPass, setShowPass]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [branchStep, setBranchStep] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(normalizeKenyanPhone(form.phone), form.password)
      if (result.requiresBranchSelection) {
        setLoading(false)
        setBranchStep({ preAuthToken: result.preAuthToken, branches: result.branches, user: result.user })
        return
      }
      // Honour the page the user was heading to, as long as it belongs to
      // their portal — otherwise land them on their own dashboard.
      const { role } = result.user
      if (ADMIN_ROLES.includes(role)) {
        navigate(from.startsWith('/admin') ? from : '/admin/dashboard', { replace: true })
      } else if (role === 'driver') {
        navigate(from.startsWith('/driver') ? from : '/driver/dashboard', { replace: true })
      } else {
        const target = ['/login', '/register', '/'].includes(from) || from.startsWith('/admin') || from.startsWith('/driver')
          ? '/dashboard' : from
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
    navigate(from.startsWith('/admin') ? from : '/admin/dashboard', { replace: true })
  }

  return (
    <>
      {/* Full-screen container — h-dvh (not min-h-screen) so the whole page is
          exactly one viewport tall on every device, including mobile browsers
          where the address bar changes the visible height. The page itself
          never scrolls; only the card below has an internal scroll safety
          valve for the rare device too short to fit everything (so a focused
          input can never end up trapped under the on-screen keyboard). */}
      <div className="h-dvh relative flex flex-col overflow-hidden">

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
        <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 pt-3 sm:pt-4 flex-shrink-0">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full
              bg-white/10 backdrop-blur-md border border-white/20 text-sm font-body
              font-medium text-white/80 hover:text-white hover:bg-white/20
              transition-all duration-200 group"
          >
            <ArrowLeft size={14} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
            Home
          </Link>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full
            bg-white/10 backdrop-blur-md border border-white/15 text-xs font-body text-white/60">
            <Shield size={11} className="text-brand-300" />
            Secure Login
          </span>
        </div>

        {/* Center — floating form. min-h-0 lets this flex child shrink instead
            of overflowing its h-dvh ancestor. */}
        <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center px-4 py-2">
          <div className="w-full max-w-sm max-h-full overflow-y-auto">

            {/* Signed out due to inactivity */}
            {signedOutForInactivity && (
              <div className="mb-2.5 flex items-start gap-2 bg-amber-50/95 border border-amber-200
                rounded-xl px-3.5 py-2 text-xs sm:text-sm font-body text-amber-800">
                <Clock size={14} className="flex-shrink-0 mt-0.5 text-amber-500" />
                You were signed out after 30 minutes of inactivity. Sign in to continue.
              </div>
            )}

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
                <div className="pt-4 pb-3 px-6 text-center border-b border-earth-100">
                  <div className="w-10 h-10 rounded-xl mx-auto mb-2 overflow-hidden
                    ring-2 ring-earth-100 shadow-sm">
                    <img src="/Vittorios-logo.jpeg" alt="Vittorios" className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                    <div className="w-full h-full bg-brand-700 items-center justify-center hidden">
                      <span className="text-white font-display font-bold text-base">V</span>
                    </div>
                  </div>
                  <h1 className="font-display text-lg font-bold text-earth-900 leading-tight">Welcome back</h1>
                  <p className="text-earth-500 text-xs mt-0.5 font-body">{shopInfo.name}</p>
                </div>

                <div className="px-6 pt-4 pb-5">
                  <form onSubmit={handleSubmit} className="space-y-3">

                    <div>
                      <label className="block text-sm font-body font-medium text-earth-700 mb-1.5">
                        Phone number
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="0712 345 678"
                        autoComplete="tel"
                        className="w-full border border-earth-200 rounded-xl px-4 py-2.5 text-sm font-body
                          text-earth-900 placeholder-earth-400 focus:outline-none focus:ring-2
                          focus:ring-brand-500 focus:border-transparent bg-white/70 transition-all"
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-body font-medium text-earth-700">
                          Password
                        </label>
                        <Link to="/forgot-password"
                          className="text-xs text-brand-600 hover:text-brand-800 font-body
                            font-medium transition-colors">
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <input
                          type={showPass ? 'text' : 'password'}
                          value={form.password}
                          onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                          placeholder="Your password"
                          autoComplete="current-password"
                          className="w-full border border-earth-200 rounded-xl px-4 py-2.5 pr-12 text-sm
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
                      <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-sm text-red-700 font-body">
                        {error}
                      </div>
                    )}

                    <button type="submit" disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600
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
                  <div className="mt-3 pt-3 border-t border-earth-100 text-center">
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
        <div className="relative z-10 pb-2 sm:pb-3 text-center flex-shrink-0">
          <p className="text-white/30 text-xs font-body">
            Vittorios Grains &amp; Cereals · Bungoma, Kenya
          </p>
        </div>

      </div>
    </>
  )
}
