import { useState } from 'react'
import { Smartphone, Store, Truck, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { paymentService } from '../../services/payment.service'
import { useAppSettings } from '../../context/AppSettingsContext'
import MpesaCountdown from '../ui/MpesaCountdown'
import { isValidKenyanPhone, normalizeKenyanPhone } from '../../utils/helpers'

// "Pay now" for an unpaid order that is still waiting for approval.
//
// Until now the only place a customer could pay was the checkout screen itself — a failed
// or timed-out prompt, a closed tab, or a change of mind left an unpaid M-Pesa order with
// no way to pay it (and "Pay on pickup instead" only changed what the screen said). This
// panel sits on the order page and the track page and:
//   • sends (or re-sends) the M-Pesa prompt, to any number the customer likes;
//   • lets them switch the order to pay-on-pickup / pay-on-delivery for real;
//   • lets an order that was set to cash switch to M-Pesa.
export default function PayNowPanel({ order, contactPhone = null, defaultPhone = '', onPaid, onChanged }) {
  const { orderSettings } = useAppSettings()
  const [phone, setPhone] = useState(defaultPhone || '')
  const [mode, setMode] = useState('idle')       // idle | form | sending | waiting
  const [error, setError] = useState('')

  const canPay = order.status === 'pending' && !['paid', 'refunded'].includes(order.paymentStatus)
  if (!canPay) return null

  const isMpesa = order.paymentMethod === 'mpesa'
  const cashMethod = order.deliveryMethod === 'pickup' ? 'pickup' : 'delivery'
  const cashAllowed = cashMethod === 'pickup' ? orderSettings.allowPayOnPickup : orderSettings.allowCashOnDelivery
  const mpesaAllowed = orderSettings.allowMpesa !== false
  const cashLabel = cashMethod === 'pickup' ? 'Pay on pickup' : 'Pay on delivery'
  const CashIcon = cashMethod === 'pickup' ? Store : Truck

  // Nothing sensible to offer: M-Pesa is off and the order is already cash.
  if (!isMpesa && !mpesaAllowed) return null

  const send = async () => {
    setError('')
    if (!isValidKenyanPhone(phone)) { setError('Enter a valid M-Pesa number, e.g. 0712 345 678'); return }
    setMode('sending')
    try {
      if (!isMpesa) {
        await paymentService.changeMethod(order._id, 'mpesa', contactPhone)
        onChanged?.({ paymentMethod: 'mpesa', paymentStatus: 'unpaid' })
      }
      await paymentService.initiate(order._id, normalizeKenyanPhone(phone), contactPhone ? normalizeKenyanPhone(contactPhone) : undefined)
      setMode('waiting')
    } catch (err) {
      setMode('form')
      setError(err.response?.data?.message || 'Could not send the M-Pesa prompt. Please try again.')
    }
  }

  const switchToCash = async () => {
    setError('')
    setMode('sending')
    try {
      await paymentService.changeMethod(order._id, cashMethod, contactPhone)
      toast.success(`Switched to ${cashLabel.toLowerCase()}`)
      onChanged?.({ paymentMethod: cashMethod, paymentStatus: 'unpaid' })
      setMode('idle')
    } catch (err) {
      setMode('idle')
      toast.error(err.response?.data?.message || 'Could not change the payment method')
    }
  }

  if (mode === 'waiting') {
    return (
      <div className="bg-white rounded-2xl border border-earth-100 shadow-warm p-5">
        <MpesaCountdown
          orderId={order._id}
          orderRef={order.orderRef}
          phone={phone}
          pollPhone={contactPhone ? normalizeKenyanPhone(contactPhone) : undefined}
          amount={order.total}
          onSuccess={() => { setMode('idle'); onPaid?.() }}
          onFailure={(reason) => {
            if (reason === 'retry') { send(); return }
            if (reason === 'switch') { switchToCash(); return }
            setMode('idle')
          }}
        />
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5" data-testid="pay-now-panel">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Smartphone size={17} className="text-amber-700" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-body font-semibold text-amber-900 text-sm">
            {isMpesa ? 'Payment needed' : 'Prefer to pay by M-Pesa?'}
          </p>
          <p className="text-amber-800 text-xs font-body mt-0.5 leading-relaxed">
            {isMpesa
              ? 'This order is waiting for your M-Pesa payment before we can confirm it.'
              : `This order is set to ${cashLabel.toLowerCase()}. You can pay now with M-Pesa instead.`}
          </p>

          {mode === 'idle' ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setMode('form')}
                className="min-h-[44px] px-4 rounded-xl bg-brand-700 text-white text-sm font-body font-semibold hover:bg-brand-800 transition-colors">
                {isMpesa ? 'Pay with M-Pesa' : 'Pay now with M-Pesa'}
              </button>
              {isMpesa && cashAllowed && (
                <button type="button" onClick={switchToCash}
                  className="min-h-[44px] px-4 rounded-xl border border-amber-300 bg-white text-amber-900 text-sm font-body font-semibold hover:bg-amber-100 transition-colors inline-flex items-center gap-1.5">
                  <CashIcon size={15} aria-hidden="true" /> {cashLabel} instead
                </button>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <label htmlFor="paynow-phone" className="block text-xs font-body font-semibold text-amber-900">
                M-Pesa number to receive the prompt
              </label>
              <input id="paynow-phone" type="tel" inputMode="tel" autoComplete="tel"
                value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678"
                aria-invalid={Boolean(error)} aria-describedby={error ? 'paynow-error' : undefined}
                className="w-full border border-amber-300 rounded-xl px-3 min-h-[44px] text-sm font-body bg-white focus:outline-none focus:ring-2 focus:ring-brand-400" />
              {error && <p id="paynow-error" role="alert" className="text-red-600 text-xs font-body">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={send} disabled={mode === 'sending'}
                  className="min-h-[44px] px-4 rounded-xl bg-brand-700 text-white text-sm font-body font-semibold hover:bg-brand-800 disabled:opacity-60 transition-colors inline-flex items-center gap-2">
                  {mode === 'sending' && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                  Send M-Pesa prompt · KES {Number(order.total).toLocaleString('en-KE')}
                </button>
                <button type="button" onClick={() => { setMode('idle'); setError('') }} disabled={mode === 'sending'}
                  className="min-h-[44px] px-4 rounded-xl text-amber-900 text-sm font-body font-semibold hover:bg-amber-100 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
          {mode === 'idle' && error && <p role="alert" className="text-red-600 text-xs font-body mt-2">{error}</p>}
        </div>
      </div>
    </div>
  )
}
