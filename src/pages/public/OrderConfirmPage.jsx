import { useState } from 'react'
import { useSearchParams, useLocation, Link } from 'react-router-dom'
import { CheckCircle, Package, Phone, Copy, Check, ArrowRight } from 'lucide-react'
import { formatKES } from '../../utils/helpers'
import { PAYMENT_LABELS } from '../../utils/constants'
import { useShopInfo } from '../../context/AppSettingsContext'

export function OrderConfirmPage() {
  const shopInfo = useShopInfo()
  const [searchParams] = useSearchParams()
  const { state } = useLocation()
  const [copied, setCopied] = useState(false)

  // Read from both sources for compatibility
  const ref            = state?.orderRef   || searchParams.get('ref')
  const total          = state?.total
  const paymentMethod  = state?.paymentMethod
  const deliveryMethod = state?.deliveryMethod
  const phone          = state?.phone
  const name           = state?.name

  const handleCopy = () => {
    if (!ref) return
    navigator.clipboard.writeText(ref).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* ── Success hero ────────────────────────────────────────────────── */}
      <div className="bg-earth-900 pt-10 pb-20 text-center px-4">
        <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full
          flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-400" />
        </div>
        <h1 className="font-display text-3xl font-bold text-cream mb-2">
          Order Placed!
        </h1>
        <p className="text-earth-400 font-body text-sm max-w-sm mx-auto">
          {name ? `Thank you, ${name.split(' ')[0]}. ` : 'Thank you! '}
          We'll confirm your order within 2 hours.
        </p>
      </div>

      <div className="container-page max-w-lg -mt-10 pb-12 flex-1">

        {/* ── Reference card (the most important thing) ─────────────────── */}
        {ref && (
          <div className="bg-white rounded-2xl shadow-warm-lg border border-earth-100 p-6 mb-4">

            {/* Big reference display */}
            <p className="text-xs font-body font-semibold text-earth-500 uppercase tracking-widest text-center mb-3">
              Your Order Reference
            </p>

            <div className="bg-brand-50 border-2 border-brand-200 rounded-xl p-5 text-center mb-4 relative">
              <p className="font-display text-3xl font-bold text-brand-700 tracking-wider mb-1">
                {ref}
              </p>
              <p className="text-brand-600 text-xs font-body">
                You'll need this to track your order
              </p>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm
                font-body font-semibold transition-all ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-earth-900 text-white hover:bg-earth-800 active:scale-[0.98]'
                }`}
            >
              {copied ? (
                <><Check size={16} /> Copied to clipboard!</>
              ) : (
                <><Copy size={16} /> Copy Reference Number</>
              )}
            </button>

            <p className="text-center text-earth-400 text-xs font-body mt-3">
              📸 Screenshot this page or save the number above
            </p>
          </div>
        )}

        {/* ── Order summary ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-earth-100 shadow-sm p-5 mb-4">
          <p className="text-xs font-body font-semibold text-earth-500 uppercase tracking-wide mb-4">
            Order Summary
          </p>

          <div className="space-y-3">
            {total && (
              <div className="flex justify-between text-sm font-body">
                <span className="text-earth-600">Total Amount</span>
                <span className="font-display font-bold text-brand-600">{formatKES(total)}</span>
              </div>
            )}
            {paymentMethod && (
              <div className="flex justify-between text-sm font-body">
                <span className="text-earth-600">Payment</span>
                <span className="text-earth-800 font-medium capitalize">
                  {PAYMENT_LABELS[paymentMethod] || paymentMethod}
                </span>
              </div>
            )}
            {deliveryMethod && (
              <div className="flex justify-between text-sm font-body">
                <span className="text-earth-600">Delivery</span>
                <span className="text-earth-800 font-medium capitalize">
                  {deliveryMethod === 'pickup' ? 'Pickup from shop' : 'Home Delivery'}
                </span>
              </div>
            )}
            {phone && (
              <div className="flex justify-between text-sm font-body">
                <span className="text-earth-600">Contact</span>
                <span className="text-earth-800 font-medium">{phone}</span>
              </div>
            )}
          </div>

          {/* What happens next */}
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mt-4">
            <p className="text-xs font-body font-semibold text-brand-700 uppercase tracking-wide mb-2">
              What Happens Next
            </p>
            <div className="space-y-2">
              {[
                'We review your order and confirm availability',
                'You\'ll get a call/WhatsApp confirmation within 2 hours',
                `${deliveryMethod === 'delivery' ? 'Your order will be packed and delivered' : 'Your order will be packed and ready for pickup'}`,
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-brand-200 text-brand-700 flex items-center
                    justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-brand-800 text-xs font-body leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          {ref && (
            <Link to={`/track?ref=${ref}`}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-earth-900
                text-white rounded-xl text-sm font-body font-semibold hover:bg-earth-800
                transition-all active:scale-[0.99]">
              <Package size={17} />
              Track This Order
              <ArrowRight size={15} className="ml-1" />
            </Link>
          )}

          <Link to="/shop"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-white border
              border-earth-200 text-earth-700 rounded-xl text-sm font-body font-semibold
              hover:bg-earth-50 transition-all">
            Continue Shopping
          </Link>

          <a href={`tel:${shopInfo.phone}`}
            className="flex items-center justify-center gap-2 w-full py-3 text-earth-500
              text-sm font-body hover:text-earth-700 transition-colors">
            <Phone size={15} />
            {shopInfo.phone}
          </a>
        </div>
      </div>
    </div>
  )
}
