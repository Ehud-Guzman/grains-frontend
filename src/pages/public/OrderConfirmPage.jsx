import { useState } from 'react'
import { useSearchParams, useLocation, Link } from 'react-router-dom'
import { CheckCircle, Package, Phone, Copy, Check, ArrowRight, MapPin, CreditCard, Truck, MessageSquare } from 'lucide-react'
import { formatKES } from '../../utils/helpers'
import { PAYMENT_LABELS } from '../../utils/constants'
import { useShopInfo } from '../../context/AppSettingsContext'

export function OrderConfirmPage() {
  const shopInfo = useShopInfo()
  const [searchParams] = useSearchParams()
  const { state } = useLocation()
  const [copied, setCopied] = useState(false)

  const ref            = state?.orderRef   || searchParams.get('ref')
  const total          = state?.total
  const paymentMethod  = state?.paymentMethod
  const deliveryMethod = state?.deliveryMethod
  const phone          = state?.phone
  const name           = state?.name

  const isMpesa = paymentMethod === 'mpesa'

  const handleCopy = () => {
    if (!ref) return
    navigator.clipboard.writeText(ref).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* ── Success hero ────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950 pt-12 pb-24 text-center px-4 relative overflow-hidden">
        {/* Decorative rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 rounded-full border border-white/5" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 rounded-full border border-white/5" />
        </div>

        <div className="relative">
          {/* Animated success icon */}
          <div className="relative inline-flex items-center justify-center mb-5">
            <div className="absolute w-24 h-24 rounded-full bg-green-500/10 animate-ping" />
            <div className="absolute w-20 h-20 rounded-full bg-green-500/15" />
            <div className="w-16 h-16 bg-green-500/20 border-2 border-green-400/40 rounded-full
              flex items-center justify-center relative z-10">
              <CheckCircle size={34} className="text-green-400" />
            </div>
          </div>

          <h1 className="font-display text-3xl font-bold text-cream mb-2">
            Order Placed!
          </h1>
          <p className="text-white/70 font-body text-sm max-w-xs mx-auto leading-relaxed">
            {name ? `Thank you, ${name.split(' ')[0]}!` : 'Thank you!'}{' '}
            We'll review and confirm within <span className="text-white font-semibold">2 hours</span>.
          </p>
        </div>
      </div>

      <div className="container-page max-w-lg -mt-14 pb-12 flex-1 space-y-4">

        {/* ── Reference ticket ─────────────────────────────────────────── */}
        {ref && (
          <div className="bg-white rounded-2xl shadow-warm-lg border border-earth-100 overflow-hidden">
            {/* Ticket top bar */}
            <div className="bg-gradient-to-r from-brand-700 to-brand-800 px-5 py-3 flex items-center justify-between">
              <p className="text-white/70 text-xs font-body uppercase tracking-widest">Order Reference</p>
              <div className="flex items-center gap-1.5 text-white/60 text-xs font-body">
                <Package size={12} />
                {shopInfo?.name || 'Vittorios'}
              </div>
            </div>

            {/* Ticket notch effect */}
            <div className="flex items-center">
              <div className="w-4 h-4 -ml-2 rounded-full bg-cream border-r border-earth-100" />
              <div className="flex-1 border-t-2 border-dashed border-earth-100 mx-1" />
              <div className="w-4 h-4 -mr-2 rounded-full bg-cream border-l border-earth-100" />
            </div>

            <div className="px-5 pt-2 pb-5">
              {/* Big ref number */}
              <div className="text-center my-4">
                <p className="font-display text-4xl font-bold text-brand-700 tracking-widest">
                  {ref}
                </p>
                <p className="text-earth-500 text-xs font-body mt-1.5">
                  Save this number to track your order
                </p>
              </div>

              {/* Copy button */}
              <button
                onClick={handleCopy}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm
                  font-body font-semibold transition-all ${
                    copied
                      ? 'bg-green-500 text-white scale-[0.98]'
                      : 'bg-brand-700 text-white hover:bg-brand-800 active:scale-[0.98]'
                  }`}
              >
                {copied ? (
                  <><Check size={16} /> Copied!</>
                ) : (
                  <><Copy size={16} /> Copy Reference Number</>
                )}
              </button>

              <p className="text-center text-earth-400 text-xs font-body mt-2.5">
                Screenshot this page to keep your reference safe
              </p>
            </div>
          </div>
        )}

        {/* ── M-Pesa tip ───────────────────────────────────────────────── */}
        {isMpesa && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              <MessageSquare size={15} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-body font-semibold text-green-800">M-Pesa Payment</p>
              <p className="text-green-700 text-xs font-body mt-0.5 leading-relaxed">
                Check your phone for an STK push prompt. Enter your M-Pesa PIN to complete payment.
                If you didn't receive it, our team will call to confirm manually.
              </p>
            </div>
          </div>
        )}

        {/* ── Order summary ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-earth-100 shadow-sm overflow-hidden">
          <p className="text-xs font-body font-semibold text-earth-600 uppercase tracking-wide px-5 pt-4 pb-3 border-b border-earth-50">
            Order Details
          </p>

          <div className="divide-y divide-earth-50">
            {total && (
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-earth-50 rounded-lg flex items-center justify-center">
                    <CreditCard size={13} className="text-earth-400" />
                  </div>
                  <span className="text-sm font-body text-earth-700">Total Amount</span>
                </div>
                <span className="font-display font-bold text-brand-700 text-base">{formatKES(total)}</span>
              </div>
            )}
            {paymentMethod && (
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-earth-50 rounded-lg flex items-center justify-center">
                    <CreditCard size={13} className="text-earth-400" />
                  </div>
                  <span className="text-sm font-body text-earth-700">Payment</span>
                </div>
                <span className="text-earth-800 font-body font-semibold text-sm capitalize">
                  {PAYMENT_LABELS[paymentMethod] || paymentMethod}
                </span>
              </div>
            )}
            {deliveryMethod && (
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-earth-50 rounded-lg flex items-center justify-center">
                    <Truck size={13} className="text-earth-400" />
                  </div>
                  <span className="text-sm font-body text-earth-700">Delivery</span>
                </div>
                <span className="text-earth-800 font-body font-semibold text-sm">
                  {deliveryMethod === 'pickup' ? 'Pickup from shop' : 'Home Delivery'}
                </span>
              </div>
            )}
            {phone && (
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-earth-50 rounded-lg flex items-center justify-center">
                    <Phone size={13} className="text-earth-400" />
                  </div>
                  <span className="text-sm font-body text-earth-700">Contact</span>
                </div>
                <span className="text-earth-800 font-body font-semibold text-sm">{phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── What happens next ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-earth-100 shadow-sm p-5">
          <p className="text-xs font-body font-semibold text-earth-600 uppercase tracking-wide mb-4">
            What Happens Next
          </p>

          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-4 top-5 bottom-5 w-px bg-earth-100" />

            <div className="space-y-4">
              {[
                {
                  icon: CheckCircle,
                  color: 'bg-brand-100 text-brand-600',
                  title: 'Order received',
                  desc: 'We\'ve got your order and are reviewing availability'
                },
                {
                  icon: Phone,
                  color: 'bg-amber-100 text-amber-600',
                  title: 'We\'ll confirm within 2 hours',
                  desc: 'Expect a call or WhatsApp from our team'
                },
                {
                  icon: deliveryMethod === 'pickup' ? MapPin : Truck,
                  color: 'bg-green-100 text-green-600',
                  title: deliveryMethod === 'pickup' ? 'Ready for pickup' : 'Packed & delivered',
                  desc: deliveryMethod === 'pickup'
                    ? 'Your order will be packed and waiting at the shop'
                    : 'Your order will be packed and delivered to you'
                },
              ].map(({ icon: Icon, color, title, desc }, i) => (
                <div key={i} className="flex items-start gap-4 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 ${color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="pt-1 pb-1">
                    <p className="text-sm font-body font-semibold text-earth-800">{title}</p>
                    <p className="text-xs font-body text-earth-500 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="space-y-3 pt-1">
          {ref && (
            <Link to={`/track?ref=${ref}`}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-brand-700
                text-white rounded-xl text-sm font-body font-semibold hover:bg-brand-800
                transition-all active:scale-[0.99]">
              <Package size={17} />
              Track This Order
              <ArrowRight size={15} className="ml-auto" />
            </Link>
          )}

          <Link to="/shop"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-white border
              border-earth-200 text-earth-700 rounded-xl text-sm font-body font-semibold
              hover:bg-earth-50 transition-all">
            Continue Shopping
          </Link>

          <a href={`tel:${shopInfo.phone}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 text-earth-500
              text-sm font-body hover:text-earth-800 transition-colors">
            <Phone size={14} />
            Questions? Call {shopInfo.phone}
          </a>
        </div>
      </div>
    </div>
  )
}
