import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, ArrowLeft, Shield, Phone, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authService } from '../../services/auth.service'
import { useShopInfo } from '../../context/AppSettingsContext'
import { isValidKenyanPhone, normalizeKenyanPhone } from '../../utils/helpers'

// ── STEP 1: REQUEST CODE ──────────────────────────────────────────────────────
function RequestCodeStep({ onSent }) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValidKenyanPhone(phone)) {
      setError('Enter a valid Kenyan number (e.g. 0712 345 678)')
      return
    }
    setError('')
    setLoading(true)
    const normalized = normalizeKenyanPhone(phone)
    try {
      await authService.forgotPassword(normalized)
      onSent(normalized)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-body font-medium text-earth-700 mb-1.5">
          Phone number
        </label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="0712 345 678"
          autoComplete="tel"
          className="w-full border border-earth-200 rounded-xl px-4 py-2.5 text-sm font-body
            text-earth-900 placeholder-earth-400 focus:outline-none focus:ring-2
            focus:ring-brand-500 focus:border-transparent bg-white/70 transition-all"
          required
          autoFocus
        />
        <p className="text-earth-400 text-xs mt-1.5 font-body">
          We'll send a 6-digit reset code by SMS (and email, if one is on file).
        </p>
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
            Sending…
          </>
        ) : (
          <><KeyRound size={17} /> Send reset code</>
        )}
      </button>
    </form>
  )
}

// ── STEP 2: ENTER CODE + NEW PASSWORD ─────────────────────────────────────────
function ResetStep({ phone, onDone, onBack }) {
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!/^\d{6}$/.test(otp)) return setError('Enter the 6-digit code sent to your phone')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (!/[A-Z]/.test(password)) return setError('Password must contain at least one uppercase letter')
    if (!/[0-9]/.test(password)) return setError('Password must contain at least one number')

    setLoading(true)
    try {
      await authService.resetPassword(phone, otp, password)
      onDone()
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code. Please request a new one.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-body font-medium text-earth-700 mb-1.5">
          6-digit code
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          className="w-full border border-earth-200 rounded-xl px-4 py-2.5 text-sm font-body
            tracking-[0.3em] text-center text-earth-900 placeholder-earth-400 focus:outline-none
            focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white/70 transition-all"
          required
          autoFocus
        />
        <p className="text-earth-400 text-xs mt-1.5 font-body">
          Sent to {phone} · expires in 10 minutes
        </p>
      </div>

      <div>
        <label className="block text-sm font-body font-medium text-earth-700 mb-1.5">
          New password
        </label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
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
            Resetting…
          </>
        ) : (
          <><KeyRound size={17} /> Reset password</>
        )}
      </button>

      <button type="button" onClick={onBack}
        className="w-full flex items-center justify-center gap-1.5 text-sm
          text-earth-500 hover:text-earth-800 font-body transition-colors py-1.5">
        <ArrowLeft size={14} />
        Use a different number
      </button>
    </form>
  )
}

// ── FORGOT PASSWORD PAGE ──────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const shopInfo = useShopInfo()
  const navigate = useNavigate()
  const [step, setStep] = useState('request') // 'request' | 'reset' | 'done'
  const [phone, setPhone] = useState('')

  const handleSent = (normalizedPhone) => {
    setPhone(normalizedPhone)
    setStep('reset')
  }

  const handleDone = () => {
    setStep('done')
    toast.success('Password reset — you can now log in.')
    setTimeout(() => navigate('/login', { replace: true }), 1500)
  }

  return (
    <div className="h-dvh relative flex flex-col overflow-hidden">
      <img
        src="/wheat-1188x792-1024x683.webp"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-brand-900/70 via-brand-900/50 to-brand-900/75" />

      <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 pt-3 sm:pt-4 flex-shrink-0">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full
            bg-white/10 backdrop-blur-md border border-white/20 text-sm font-body
            font-medium text-white/80 hover:text-white hover:bg-white/20
            transition-all duration-200 group"
        >
          <ArrowLeft size={14} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back to login
        </Link>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full
          bg-white/10 backdrop-blur-md border border-white/15 text-xs font-body text-white/60">
          <Shield size={11} className="text-brand-300" />
          Secure Reset
        </span>
      </div>

      <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center px-4 py-2">
        <div className="w-full max-w-sm max-h-full overflow-y-auto">
          <div
            className="rounded-2xl overflow-hidden border border-white/25"
            style={{
              background: 'rgba(255,255,255,0.91)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 32px 64px rgba(10,6,2,0.50), 0 0 0 1px rgba(255,255,255,0.12)',
            }}
          >
            <div className="h-1 bg-gradient-to-r from-brand-700 via-brand-500 to-brand-400" />

            <div className="pt-4 pb-3 px-6 text-center border-b border-earth-100">
              <div className="w-10 h-10 rounded-xl mx-auto mb-2 bg-brand-50 border border-brand-200
                flex items-center justify-center">
                {step === 'done'
                  ? <CheckCircle2 size={18} className="text-green-600" />
                  : <KeyRound size={18} className="text-brand-600" />}
              </div>
              <h1 className="font-display text-lg font-bold text-earth-900 leading-tight">
                {step === 'request' && 'Reset your password'}
                {step === 'reset'   && 'Enter your code'}
                {step === 'done'    && 'Password reset'}
              </h1>
              <p className="text-earth-500 text-xs mt-0.5 font-body">{shopInfo.name}</p>
            </div>

            <div className="px-6 pt-4 pb-5">
              {step === 'request' && <RequestCodeStep onSent={handleSent} />}
              {step === 'reset' && (
                <ResetStep phone={phone} onDone={handleDone} onBack={() => setStep('request')} />
              )}
              {step === 'done' && (
                <p className="text-sm text-earth-600 font-body text-center py-2">
                  Redirecting you to login…
                </p>
              )}

              {shopInfo.phone && step !== 'done' && (
                <div className="mt-3 pt-3 border-t border-earth-100 text-center">
                  <p className="text-sm text-earth-500 font-body">
                    Trouble resetting?{' '}
                    <a href={`tel:${shopInfo.phone.replace(/\s/g, '')}`}
                      className="text-brand-600 hover:text-brand-800 font-semibold transition-colors
                        inline-flex items-center gap-1">
                      <Phone size={12} /> Call us
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 pb-2 sm:pb-3 text-center flex-shrink-0">
        <p className="text-white/30 text-xs font-body">
          Vittorios Grains &amp; Cereals · Bungoma, Kenya
        </p>
      </div>
    </div>
  )
}
