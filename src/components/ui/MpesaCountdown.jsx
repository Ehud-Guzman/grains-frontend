import { useState, useEffect, useRef } from 'react'
import { Phone, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'
import { paymentService } from '../../services/payment.service'
import { formatKES } from '../../utils/helpers'
import { MPESA_POLL_TIMEOUT_SECONDS, MPESA_SUCCESS_REDIRECT_DELAY_MS } from '../../utils/constants'

const POLL_INTERVAL = 5000 // poll every 5 seconds
const TIMEOUT_MS    = MPESA_POLL_TIMEOUT_SECONDS * 1000

export default function MpesaCountdown({ orderId, orderRef, phone, amount, onSuccess, onFailure }) {
  const [secondsLeft, setSecondsLeft] = useState(MPESA_POLL_TIMEOUT_SECONDS)
  const [status, setStatus]           = useState('pending') // pending | paid | failed | timeout
  const [message, setMessage]         = useState('')
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
  const pollRef    = useRef(null)
  const countdownRef = useRef(null)
  const startTime  = useRef(Date.now())
  const statusRef  = useRef('pending')

  // Terminal states stay on screen — the failed/timeout view has its own
  // "Try Again" / "Pay on Pickup" / "View order" actions, so navigation only
  // happens when the customer picks one (not out from under them).
  const settle = (nextStatus, msg) => {
    if (statusRef.current !== 'pending') return
    statusRef.current = nextStatus
    setStatus(nextStatus)
    if (msg) setMessage(msg)
    clearInterval(pollRef.current)
    clearInterval(countdownRef.current)
    if (nextStatus === 'paid') setTimeout(() => onSuccess?.(), MPESA_SUCCESS_REDIRECT_DELAY_MS)
  }

  // ── POLLING ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await paymentService.getStatus(orderId, phone)
        setConsecutiveErrors(0)
        const paymentStatus = res.data.data.paymentStatus

        if (paymentStatus === 'paid') {
          settle('paid')
          return
        }

        if (paymentStatus === 'failed') {
          settle('failed', 'Payment was cancelled or failed. You can retry or choose a different method.')
        }
      } catch {
        // Network error — keep polling and show warning after repeated failures
        setConsecutiveErrors(prev => prev + 1)
      }
    }

    pollRef.current = setInterval(poll, POLL_INTERVAL)
    poll() // Poll immediately on mount

    return () => clearInterval(pollRef.current)
  }, [orderId])

  // ── COUNTDOWN ───────────────────────────────────────────────────────────────
  // The countdown owns the timeout: it fires even when status polls are failing
  // (e.g. the customer's data connection dropped after the STK push went out),
  // so the screen can never get stuck at 0s "checking payment status".
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setSecondsLeft(s => Math.max(0, s - 1))
      if (Date.now() - startTime.current >= TIMEOUT_MS) {
        settle('timeout', 'No response received. Your order is saved — you can pay on pickup or try again.')
      }
    }, 1000)

    return () => clearInterval(countdownRef.current)
  }, [])

  const progress = (secondsLeft / MPESA_POLL_TIMEOUT_SECONDS) * 100

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
        <button onClick={() => onFailure?.('continue')}
          className="mt-4 text-sm text-earth-400 hover:text-earth-700 font-body underline transition-colors">
          Skip for now — view my order
        </button>
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

      {consecutiveErrors >= 3 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-body text-amber-700">
          Having trouble checking payment status due to network issues. We are still retrying.
        </div>
      )}
    </div>
  )
}
