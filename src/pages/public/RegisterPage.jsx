import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserPlus, CheckCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { isValidKenyanPhone } from '../../utils/helpers'
import { SHOP_INFO } from '../../utils/constants'

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

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const strength = getStrength(form.password)

  const validate = () => {
    const e = {}
    if (!form.name.trim() || form.name.length < 2) e.name = 'Name must be at least 2 characters'
    if (!isValidKenyanPhone(form.phone)) e.phone = 'Enter a valid Kenyan number (e.g. 0712345678)'
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const user = await register(form)
      toast.success(`Welcome, ${user.name.split(' ')[0]}!`)
      navigate('/')
    } catch (err) {
      const code = err.response?.data?.error
      if (code === 'PHONE_TAKEN') setErrors(p => ({ ...p, phone: 'This phone number is already registered' }))
      else if (code === 'EMAIL_TAKEN') setErrors(p => ({ ...p, email: 'This email is already registered' }))
      else toast.error(err.response?.data?.message || 'Registration failed.')
    } finally { setLoading(false) }
  }

  const fieldClass = (key) =>
    `w-full border rounded-xl px-4 py-3 text-sm font-body text-earth-800 placeholder-earth-400
    focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-earth-50 ${
      errors[key]
        ? 'border-red-300 focus:ring-red-300'
        : 'border-earth-200 focus:ring-brand-400'
    }`

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* Top brand strip */}
      <div className="bg-earth-900 py-3 px-4 text-center">
        <Link to="/" className="text-earth-400 text-xs font-body hover:text-cream transition-colors">
          ← Back to {SHOP_INFO.name}
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-earth-900 rounded-2xl flex items-center justify-center
              mx-auto mb-4 shadow-warm overflow-hidden">
              <img src="/Vittorios-logo.jpeg" alt="Vittorios"
                className="w-full h-full object-cover"
                onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
              <div className="w-full h-full items-center justify-center hidden">
                <span className="text-white font-display font-bold text-2xl">V</span>
              </div>
            </div>
            <h1 className="font-display text-2xl font-bold text-earth-900">Create an account</h1>
            <p className="text-earth-500 text-sm mt-1 font-body">Join {SHOP_INFO.name}</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-warm border border-earth-100 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-xs font-body font-semibold text-earth-600
                  uppercase tracking-wide mb-1.5">Full Name</label>
                <input type="text" placeholder="John Kamau" required autoFocus
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className={fieldClass('name')} />
                {errors.name && <p className="text-red-500 text-xs mt-1 font-body">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-body font-semibold text-earth-600
                  uppercase tracking-wide mb-1.5">Phone Number</label>
                <input type="tel" placeholder="0712 345 678" required
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className={fieldClass('phone')} />
                {errors.phone && <p className="text-red-500 text-xs mt-1 font-body">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-xs font-body font-semibold text-earth-600
                  uppercase tracking-wide mb-1.5">
                  Email <span className="text-earth-400 font-normal normal-case">(optional)</span>
                </label>
                <input type="email" placeholder="john@example.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className={fieldClass('email')} />
                {errors.email && <p className="text-red-500 text-xs mt-1 font-body">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-body font-semibold text-earth-600
                  uppercase tracking-wide mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="At least 8 characters" required
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    className={fieldClass('password') + ' pr-12'}
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-earth-400
                      hover:text-earth-600 p-1 transition-colors">
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                {/* Strength meter */}
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            i <= strength.score ? strength.color : 'bg-earth-100'
                          }`} />
                      ))}
                    </div>
                    <p className={`text-xs font-body ${
                      strength.score <= 1 ? 'text-red-500' :
                      strength.score <= 3 ? 'text-amber-500' : 'text-green-600'
                    }`}>{strength.label}</p>
                  </div>
                )}
                {errors.password && <p className="text-red-500 text-xs mt-1 font-body">{errors.password}</p>}
              </div>

              <button type="submit" disabled={loading}
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-earth-900
                  text-white rounded-xl font-body font-semibold text-sm hover:bg-earth-800
                  transition-all active:scale-[0.98] disabled:opacity-60 shadow-warm mt-2">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating account…</>
                ) : (
                  <><UserPlus size={17} /> Create Account</>
                )}
              </button>
            </form>

            <div className="border-t border-earth-100 mt-5 pt-5 text-center">
              <p className="text-sm text-earth-500 font-body">
                Already have an account?{' '}
                <Link to="/login" className="text-brand-600 hover:text-brand-700 font-semibold transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-earth-400 mt-5 font-body">
            <Link to="/shop" className="hover:text-brand-600 transition-colors">
              ← Continue browsing without an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}