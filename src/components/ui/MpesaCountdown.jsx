import { useState, useEffect, useRef } from 'react'
import { Phone, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'
import { paymentService } from '../../services/payment.service'
import { formatKES } from '../../utils/helpers'

const POLL_INTERVAL = 5000   // poll every 5 seconds
const TIMEOUT_MS    = 120000 // 2 minutes total

export default function MpesaCountdown({ orderId, orderRef, phone, amount, onSuccess, onFailure }) {
  const [secondsLeft, setSecondsLeft] = useState(120)
  const [status, setStatus]           = useState('pending') // pending | paid | failed | timeout
  const [message, setMessage]         = useState('')
  const pollRef    = useRef(null)
  const countdownRef = useRef(null)
  const startTime  = useRef(Date.now())

  // ── POLLING ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await paymentService.getStatus(orderId)
        const paymentStatus = res.data.data.paymentStatus

        if (paymentStatus === 'paid') {
          setStatus('paid')
          clearInterval(pollRef.current)
          clearInterval(countdownRef.current)
          setTimeout(() => onSuccess?.(), 1500)
          return
        }

        if (paymentStatus === 'failed') {
          setStatus('failed')
          setMessage('Payment was cancelled or failed. You can retry or choose a different method.')
          clearInterval(pollRef.current)
          clearInterval(countdownRef.current)
          onFailure?.('failed')
          return
        }

        // Check timeout
        if (Date.now() - startTime.current >= TIMEOUT_MS) {
          setStatus('timeout')
          setMessage('No response received. Your order is saved — you can pay on pickup or try again.')
          clearInterval(pollRef.current)
          clearInterval(countdownRef.current)
          onFailure?.('timeout')
        }
      } catch {
        // Network error — keep polling
      }
    }

    pollRef.current = setInterval(poll, POLL_INTERVAL)
    poll() // Poll immediately on mount

    return () => clearInterval(pollRef.current)
  }, [orderId])

  // ── COUNTDOWN ───────────────────────────────────────────────────────────────
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(countdownRef.current)
          return 0
        }
        return s - 1
      })
    }, 1000)

    return () => clearInterval(countdownRef.current)
  }, [])

  const progress = (secondsLeft / 120) * 100

  // ── PAID ─────────────────────────────────────────────────────────────────────
  if (status === 'paid') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center
          mx-auto mb-4">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h3 className="font-display text-xl font-bold text-earth-900 mb-2">Payment Confirmed!</h3>
        <p className="text-earth-500 font-body text-sm">Redirecting to your order…</p>
      </div>
    )
  }

  // ── FAILED / TIMEOUT ──────────────────────────────────────────────────────────
  if (status === 'failed' || status === 'timeout') {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center
          mx-auto mb-4">
          <XCircle size={32} className="text-red-500" />
        </div>
        <h3 className="font-display text-lg font-bold text-earth-900 mb-2">
          {status === 'timeout' ? 'Payment Timed Out' : 'Payment Failed'}
        </h3>
        <p className="text-earth-500 font-body text-sm mb-6 max-w-xs mx-auto">{message}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => onFailure?.('retry')}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-brand-500 text-white
              rounded-xl font-body font-semibold hover:bg-brand-600 transition-colors">
            <RefreshCw size={15} /> Try Again
          </button>
          <button onClick={() => onFailure?.('switch')}
            className="flex items-center justify-center gap-2 px-5 py-3 border border-earth-200
              text-earth-600 rounded-xl font-body font-medium hover:bg-earth-50 transition-colors">
            Pay on Pickup Instead
          </button>
        </div>
      </div>
    )
  }

  // ── PENDING (waiting for PIN) ─────────────────────────────────────────────────
  return (
    <div className="text-center py-6">
      {/* Circular progress */}
      <div className="relative w-24 h-24 mx-auto mb-5">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#E5E7EB" strokeWidth="8" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="#C8912A" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display font-bold text-earth-900 text-xl">{secondsLeft}s</span>
        </div>
      </div>

      {/* Phone icon + message */}
      <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Phone size={20} className="text-brand-600" />
      </div>

      <h3 className="font-display text-lg font-bold text-earth-900 mb-2">
        Check Your Phone
      </h3>
      <p className="text-earth-600 font-body text-sm mb-5 max-w-xs mx-auto">
        An M-Pesa prompt has been sent to <strong>{phone}</strong>. Enter your PIN to complete the payment.
      </p>

      {/* Order summary */}
      <div className="bg-earth-50 rounded-2xl p-4 max-w-xs mx-auto text-left space-y-2 mb-5">
        <div className="flex justify-between text-sm font-body">
          <span className="text-earth-500">Order</span>
          <span className="font-semibold text-earth-800">{orderRef}</span>
        </div>
        <div className="flex justify-between text-sm font-body">
          <span className="text-earth-500">Amount</span>
          <span className="font-bold text-brand-600">{formatKES(amount)}</span>
        </div>
        <div className="flex justify-between text-sm font-body">
          <span className="text-earth-500">Phone</span>
          <span className="font-semibold text-earth-800">{phone}</span>
        </div>
      </div>

      {/* Polling indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-earth-400 font-body">
        <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
        Checking payment status…
      </div>
    </div>
  )
}