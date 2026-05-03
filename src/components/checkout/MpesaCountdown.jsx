import { useState, useEffect, useRef } from 'react'
import { Smartphone, RefreshCw, XCircle } from 'lucide-react'
import api from '../../services/api'
import { formatKES } from '../../utils/helpers'
import { MPESA_POLL_TIMEOUT_SECONDS, MPESA_SUCCESS_REDIRECT_DELAY_MS } from '../../utils/constants'

export default function MpesaCountdown({ orderId, phone, amount, orderRef, onSuccess, onFailure }) {
  const [seconds, setSeconds] = useState(MPESA_POLL_TIMEOUT_SECONDS)
  const [status, setStatus] = useState('waiting') // waiting | paid | failed
  const [pollError, setPollError] = useState(false)
  const pollRef = useRef(null)
  const timerRef = useRef(null)
  const consecutiveErrors = useRef(0)

  useEffect(() => {
    // Poll every 5 seconds
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/payments/status/${orderId}`)
        consecutiveErrors.current = 0
        setPollError(false)
        const paymentStatus = res.data.data?.paymentStatus
        if (paymentStatus === 'paid') {
          clearInterval(pollRef.current)
          clearInterval(timerRef.current)
          setStatus('paid')
          setTimeout(() => onSuccess(), MPESA_SUCCESS_REDIRECT_DELAY_MS)
        } else if (paymentStatus === 'failed') {
          clearInterval(pollRef.current)
          clearInterval(timerRef.current)
          setStatus('failed')
        }
      } catch {
        consecutiveErrors.current += 1
        if (consecutiveErrors.current >= 3) setPollError(true)
      }
    }, 5000)

    // Countdown timer
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(pollRef.current)
          clearInterval(timerRef.current)
          setStatus('failed')
          return 0
        }
        return s - 1
      })
    }, 1000)

    return () => {
      clearInterval(pollRef.current)
      clearInterval(timerRef.current)
    }
  }, [orderId, onSuccess])

  if (status === 'paid') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <p className="font-display text-xl font-semibold text-green-700">Payment confirmed!</p>
        <p className="text-earth-500 text-sm mt-1">Redirecting you now…</p>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="text-center py-8">
        <XCircle size={48} className="text-red-400 mx-auto mb-4" />
        <p className="font-display text-xl font-semibold text-red-700 mb-2">Payment timed out</p>
        <p className="text-earth-500 text-sm mb-6">
          Your order has been saved. You can pay on pickup or try again.
        </p>
        <button onClick={onFailure} className="btn-primary">
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 bg-green-50 border-2 border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
        <Smartphone size={28} className="text-green-600" />
      </div>

      <h3 className="font-display text-xl font-semibold text-earth-900 mb-1">
        Check your phone
      </h3>
      <p className="text-earth-500 text-sm mb-5">
        An M-Pesa prompt has been sent to <strong className="text-earth-700">{phone}</strong>
      </p>

      <div className="bg-earth-50 rounded-xl p-4 mb-5 text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-earth-500">Amount</span>
          <span className="font-semibold text-earth-800">{formatKES(amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-earth-500">Order</span>
          <span className="font-semibold text-earth-800">{orderRef}</span>
        </div>
      </div>

      <p className="text-earth-500 text-sm mb-3">Enter your M-Pesa PIN to complete payment</p>

      {/* Countdown ring */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
          ${seconds > 20 ? 'bg-green-100 text-green-700' : seconds > 10 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
          {seconds}
        </div>
        <span className="text-earth-400 text-sm">seconds remaining</span>
      </div>

      {pollError && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
          Having trouble checking payment status. Your payment will still be confirmed if you completed it.
        </p>
      )}

      <p className="text-xs text-earth-400">
        Polling for payment confirmation every 5 seconds…
      </p>
    </div>
  )
}
