import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Check, MapPin, CreditCard,
  User, ShoppingBag, Truck, Store, Smartphone, Navigation, X
} from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useAppSettings } from '../../context/AppSettingsContext'
import { useOnboarding } from '../../context/OnboardingContext'
import { orderService } from '../../services/order.service'
import { paymentService } from '../../services/payment.service'
import { publicSettingsService } from '../../services/admin/settings.service'
import { ContextualTip } from '../../components/onboarding/OnboardingEnhancements'
import { formatKES, isValidKenyanPhone } from '../../utils/helpers'
import { PAYMENT_LABELS } from '../../utils/constants'
import MpesaCountdown from '../../components/ui/MpesaCountdown'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import { getOptimizedImageUrl } from '../../utils/image'

const STEPS = [
  { label: 'Contact',  icon: User       },
  { label: 'Delivery', icon: MapPin     },
  { label: 'Payment',  icon: CreditCard },
  { label: 'Review',   icon: ShoppingBag},
  { label: 'Confirm',  icon: Check      },
]

// ── UI ATOMS ──────────────────────────────────────────────────────────────────
const Field = ({ label, error, required, children }) => (
  <div>
    <label className="block text-xs font-body font-semibold text-earth-800 uppercase
      tracking-wide mb-1.5">
      {label}{required && <span className="text-red-400 normal-case font-normal ml-0.5">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-body">
        <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />{error}
      </p>
    )}
  </div>
)

const Input = ({ error, ...props }) => (
  <input {...props}
    className={`w-full border rounded-xl px-4 py-3 text-sm font-body text-earth-800
      placeholder-earth-400 focus:outline-none focus:ring-2 focus:border-transparent
      transition-all bg-earth-50 ${
        error
          ? 'border-red-300 focus:ring-red-300'
          : 'border-earth-200 focus:ring-brand-400'
      } ${props.className || ''}`}
  />
)

const OptionCard = ({ icon: Icon, label, desc, checked, onChange, badge, disabled, disabledReason }) => (
  <label className={`flex items-start gap-4 p-4 border-2 rounded-xl transition-all ${
    disabled
      ? 'border-earth-100 bg-earth-50 opacity-60 cursor-not-allowed'
      : checked
        ? 'border-brand-500 bg-brand-50 shadow-sm cursor-pointer'
        : 'border-earth-200 hover:border-earth-300 bg-white cursor-pointer'
  }`}>
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
      disabled ? 'bg-earth-100 text-earth-400' : checked ? 'bg-brand-500 text-white' : 'bg-earth-100 text-earth-600'
    }`}>
      <Icon size={18} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className={`font-body font-semibold text-sm ${
          disabled ? 'text-earth-400' : checked ? 'text-brand-800' : 'text-earth-800'
        }`}>{label}</p>
        {badge && !disabled && (
          <span className="text-xs bg-green-100 text-green-700 font-body font-semibold
            px-2 py-0.5 rounded-full border border-green-200">
            {badge}
          </span>
        )}
        {disabled && (
          <span className="text-xs bg-red-50 text-red-500 font-body font-semibold
            px-2 py-0.5 rounded-full border border-red-100">
            Unavailable
          </span>
        )}
      </div>
      <p className={`text-xs mt-0.5 font-body ${disabled ? 'text-earth-400' : 'text-earth-700'}`}>
        {disabled && disabledReason ? disabledReason : desc}
      </p>
    </div>
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
      flex-shrink-0 mt-0.5 transition-all ${
        disabled ? 'border-earth-200' : checked ? 'border-brand-500 bg-brand-500' : 'border-earth-300'
      }`}>
      {checked && !disabled && <div className="w-2 h-2 rounded-full bg-white" />}
    </div>
    <input type="radio" checked={checked} onChange={disabled ? undefined : onChange} disabled={disabled} className="sr-only" />
  </label>
)

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const { items, subtotal: total, clearCart } = useCart()
  const { user, isAuthenticated } = useAuth()
  const { orderSettings, isLoading: settingsLoading, hasLoaded } = useAppSettings()
  const { dismissedTips, dismissTip, markChecklistItem, markMilestone } = useOnboarding()
  const navigate = useNavigate()

  const [step, setStep]       = useState(0)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState({})

  // After order is placed — used for M-Pesa flow
  const [placedOrder, setPlacedOrder] = useState(null) // { orderId, orderRef, total }
  const [showMpesa, setShowMpesa]     = useState(false)

  // Distance-based delivery fee
  const [locating, setLocating]               = useState(false)
  const [deliveryCoordinates, setDeliveryCoords] = useState(null) // { lat, lng }
  const [locationFeeData, setLocationFeeData] = useState(null)   // { fee, distanceKm, zoneName }
  const feeDebounce = useRef(null)

  const [form, setForm] = useState({
    name:                user?.name  || '',
    phone:               user?.phone || '',
    email:               user?.email || '',
    deliveryMethod:      'pickup',
    deliveryAddress:     '',
    paymentMethod:       'pickup',
    mpesaPhone:          user?.phone || '', // can differ from contact phone
    specialInstructions: ''
  })

  // If mode === 'distance' and coords are known → use calculated fee; else fall back to flat
  const deliveryFee = form.deliveryMethod === 'delivery'
    ? (locationFeeData?.fee ?? orderSettings.deliveryFee)
    : 0
  const vatEnabled  = orderSettings.vatEnabled === true
  const vatRate     = vatEnabled ? (Number(orderSettings.vatRate) || 0) : 0
  const vatAmount   = vatEnabled ? Math.round(total * vatRate) / 100 : 0
  const orderTotal  = total + deliveryFee + vatAmount
  const belowMinimum = orderSettings.minimumOrderValue > 0 && total < orderSettings.minimumOrderValue
  const availablePaymentOptions = [
    orderSettings.allowMpesa && {
      value: 'mpesa',
      icon: Smartphone,
      label: 'M-Pesa',
      desc: 'Pay instantly via M-Pesa STK push — you\'ll get a prompt on your phone',
      badge: 'Recommended',
    },
    form.deliveryMethod === 'pickup' && orderSettings.allowPayOnPickup && {
      value: 'pickup',
      icon: Store,
      label: 'Pay on Pickup',
      desc: 'Pay cash or M-Pesa when you collect your order',
    },
    form.deliveryMethod === 'delivery' && orderSettings.allowCashOnDelivery && {
      value: 'delivery',
      icon: Truck,
      label: 'Pay on Delivery',
      desc: 'Pay when your order arrives at your door',
    },
  ].filter(Boolean)
  const showCheckoutTip = !dismissedTips['customer-checkout-tip']

  useEffect(() => {
    if (!availablePaymentOptions.some(option => option.value === form.paymentMethod) && availablePaymentOptions[0]) {
      setForm(current => ({ ...current, paymentMethod: availablePaymentOptions[0].value }))
    }
  }, [availablePaymentOptions, form.paymentMethod])

  // Auto-switch to pickup when GPS confirms delivery is out of range
  useEffect(() => {
    if (locationFeeData?.deliveryAvailable === false && form.deliveryMethod === 'delivery') {
      setForm(current => ({ ...current, deliveryMethod: 'pickup', paymentMethod: 'pickup' }))
    }
  }, [locationFeeData, form.deliveryMethod])

  if (settingsLoading && !hasLoaded) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <Spinner size="lg" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-earth-100 rounded-2xl flex items-center justify-center
            mx-auto mb-4">
            <ShoppingBag size={28} className="text-earth-400" />
          </div>
          <h2 className="font-display text-xl text-earth-800 mb-2">Your cart is empty</h2>
          <p className="text-earth-700 text-sm font-body mb-6">
            Add some products before checking out
          </p>
          <Link to="/shop" className="btn-primary">Browse Products</Link>
        </div>
      </div>
    )
  }

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  // Reset location data when switching away from delivery
  const handleDeliveryMethodChange = (method) => {
    set('deliveryMethod', method)
    if (method !== 'delivery') {
      setDeliveryCoords(null)
      setLocationFeeData(null)
    }
  }

  // Geolocation — request browser location, then fetch fee from backend
  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords
        setDeliveryCoords({ lat, lng })
        clearTimeout(feeDebounce.current)
        feeDebounce.current = setTimeout(async () => {
          try {
            const res = await publicSettingsService.getDeliveryFee(lat, lng)
            setLocationFeeData(res.data.data)
          } catch {
            // Non-fatal — fall back to flat fee silently
          } finally {
            setLocating(false)
          }
        }, 200)
      },
      (err) => {
        setLocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Location access denied — using default delivery fee')
        } else {
          toast.error('Could not detect location — using default delivery fee')
        }
      },
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }

  const clearLocation = () => {
    setDeliveryCoords(null)
    setLocationFeeData(null)
  }

  if (!isAuthenticated && !orderSettings.allowGuestOrders) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-earth-100 shadow-warm p-7 text-center">
          <div className="w-16 h-16 bg-earth-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User size={28} className="text-earth-500" />
          </div>
          <h2 className="font-display text-2xl text-earth-900 mb-2">Sign In Required</h2>
          <p className="text-earth-700 text-sm font-body leading-relaxed mb-6">
            Guest checkout is currently disabled. Please sign in or create an account to place your order.
          </p>
          <div className="space-y-3">
            <Link to="/login" className="btn-primary w-full justify-center">
              Sign In
            </Link>
            <Link to="/register" className="btn-outline w-full justify-center">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const validate = () => {
    const e = {}
    if (step === 0) {
      if (!form.name.trim())  e.name = 'Name is required'
      if (!form.phone.trim()) e.phone = 'Phone number is required'
      else if (!isValidKenyanPhone(form.phone)) e.phone = 'Enter a valid Kenyan number (e.g. 0712345678)'
    }
    if (step === 1 && form.deliveryMethod === 'delivery' && !form.deliveryAddress.trim()) {
      e.deliveryAddress = 'Please enter a delivery address'
    }
    if (step === 2 && form.paymentMethod === 'mpesa') {
      if (!form.mpesaPhone.trim()) e.mpesaPhone = 'M-Pesa phone number is required'
      else if (!isValidKenyanPhone(form.mpesaPhone)) e.mpesaPhone = 'Enter a valid M-Pesa number'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => {
    if (!validate()) return
    if (step === 3 && belowMinimum) {
      toast.error(`Minimum order value is ${formatKES(orderSettings.minimumOrderValue)}`)
      return
    }
    if (step === 2 && availablePaymentOptions.length === 0) {
      toast.error('No payment methods are available for this order right now.')
      return
    }
    setStep(s => Math.min(s + 1, 4))
  }
  const back = () => setStep(s => Math.max(s - 1, 0))

  // ── PLACE ORDER ────────────────────────────────────────────────────────────
  const submit = async () => {
    if (belowMinimum) {
      toast.error(`Minimum order value is ${formatKES(orderSettings.minimumOrderValue)}`)
      return
    }

    setLoading(true)
    try {
      const orderData = {
        name:                form.name,
        phone:               form.phone,
        email:               form.email || undefined,
        deliveryMethod:      form.deliveryMethod,
        deliveryAddress:     form.deliveryAddress || null,
        paymentMethod:       form.paymentMethod,
        specialInstructions: form.specialInstructions || null,
        // Include GPS coords if captured — backend re-calculates fee from these
        deliveryCoordinates: deliveryCoordinates ?? undefined,
        orderItems: items.map(i => ({
          productId: i.productId,
          variety:   i.variety,
          packaging: i.packaging,
          quantity:  i.quantity
        }))
      }

      const res = isAuthenticated
        ? await orderService.placeOrder(orderData)
        : await orderService.placeGuestOrder(orderData)

      const { orderRef, orderId, total: orderTotal } = res.data.data
      if (isAuthenticated && user?.role === 'customer') {
        markChecklistItem('customer', 'first_order')
        markMilestone('customer:first_order')
      }
      clearCart()

      // ── M-PESA FLOW ───────────────────────────────────────────────────────
      if (form.paymentMethod === 'mpesa') {
        // Store order details and initiate STK push
        setPlacedOrder({ orderId, orderRef, total: orderTotal })

        try {
          await paymentService.initiate(orderId, form.mpesaPhone, orderTotal)
          setShowMpesa(true) // Show countdown screen
        } catch (err) {
          // STK push failed — order is still placed, redirect with failed payment
          const msg = err.response?.data?.message || 'M-Pesa request failed'
          toast.error(msg)
          // Redirect to confirm page — customer can pay on pickup instead
          navigate(`/order-confirmed?ref=${orderRef}`, {
            state: {
              orderRef, total: orderTotal,
              paymentMethod: 'mpesa',
              paymentFailed: true,
              deliveryMethod: form.deliveryMethod,
              phone: form.phone,
              name: form.name,
            }
          })
        }
        return
      }

      // ── NON-MPESA FLOW ────────────────────────────────────────────────────
      navigate(`/order-confirmed?ref=${orderRef}`, {
        state: {
          orderRef,
          total: orderTotal,
          paymentMethod: form.paymentMethod,
          deliveryMethod: form.deliveryMethod,
          phone: form.phone,
          name: form.name,
        }
      })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── M-PESA CALLBACKS ───────────────────────────────────────────────────────
  const handleMpesaSuccess = () => {
    navigate(`/order-confirmed?ref=${placedOrder.orderRef}`, {
      state: {
        orderRef:      placedOrder.orderRef,
        total:         placedOrder.total,
        paymentMethod: 'mpesa',
        paymentPaid:   true,
        deliveryMethod: form.deliveryMethod,
        phone:         form.phone,
        name:          form.name,
      }
    })
  }

  const handleMpesaFailure = (reason) => {
    if (reason === 'retry') {
      // Re-initiate STK push with same order
      setShowMpesa(false)
      setLoading(true)
      paymentService.initiate(placedOrder.orderId, form.mpesaPhone, placedOrder.total)
        .then(() => { setLoading(false); setShowMpesa(true) })
        .catch(err => {
          setLoading(false)
          toast.error(err.response?.data?.message || 'Failed to resend M-Pesa prompt')
        })
      return
    }
    if (reason === 'switch') {
      // User wants to pay on pickup instead — go to confirmation page
      navigate(`/order-confirmed?ref=${placedOrder.orderRef}`, {
        state: {
          orderRef:      placedOrder.orderRef,
          total:         placedOrder.total,
          paymentMethod: 'pickup',
          paymentSwitched: true,
          deliveryMethod: form.deliveryMethod,
          phone:         form.phone,
          name:          form.name,
        }
      })
      return
    }
    // Timeout — go to confirmation with pending status
    navigate(`/order-confirmed?ref=${placedOrder.orderRef}`, {
      state: {
        orderRef:      placedOrder.orderRef,
        total:         placedOrder.total,
        paymentMethod: 'mpesa',
        paymentTimeout: true,
        deliveryMethod: form.deliveryMethod,
        phone:         form.phone,
        name:          form.name,
      }
    })
  }

  // ── M-PESA COUNTDOWN SCREEN ────────────────────────────────────────────────
  if (showMpesa && placedOrder) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-earth-100
          shadow-warm p-6">
          <MpesaCountdown
            orderId={placedOrder.orderId}
            orderRef={placedOrder.orderRef}
            phone={form.mpesaPhone}
            amount={placedOrder.total}
            onSuccess={handleMpesaSuccess}
            onFailure={handleMpesaFailure}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Header + Stepper ─────────────────────────────────────────── */}
      <div className="bg-brand-800 text-white py-6">
        <div className="container-page max-w-3xl">
          <div className="flex items-center gap-3 mb-5">
            <Link to="/cart"
              className="text-white/70 hover:text-white transition-colors p-1">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="font-display text-xl font-semibold">Checkout</h1>
          </div>

          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const done   = i < step
              const active = i === step
              return (
                <div key={s.label} className="flex items-center flex-1 last:flex-none">
                  <button
                    onClick={() => done && setStep(i)}
                    className={`flex items-center gap-1.5 transition-all ${
                      done ? 'cursor-pointer' : 'cursor-default'
                    }`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center
                      text-xs font-semibold border-2 transition-all flex-shrink-0 ${
                        done   ? 'bg-brand-500 border-brand-500 text-white' :
                        active ? 'bg-white border-brand-400 text-brand-600' :
                                 'bg-transparent border-white/30 text-white/40'
                      }`}>
                      {done ? <Check size={12} /> : i + 1}
                    </div>
                    <span className={`text-xs font-body hidden sm:block ${
                      active ? 'text-white font-medium' : done ? 'text-white/70' : 'text-white/40'
                    }`}>{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 h-px mx-2 bg-white/20">
                      <div className={`h-full bg-brand-500 transition-all duration-500 ${
                        done ? 'w-full' : 'w-0'
                      }`} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="container-page max-w-3xl py-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Form ──────────────────────────────────────────────────── */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-earth-100 shadow-sm p-6">
              {showCheckoutTip && (step === 1 || step === 2) && (
                <div className="mb-5">
                  <ContextualTip
                    tipId="customer-checkout-tip"
                    onDismiss={dismissTip}
                    title={step === 1 ? 'Delivery choice shapes the rest of checkout' : 'Payment options adapt to the order'}
                    body={step === 1
                      ? 'Pickup and delivery each unlock different payment flows and final totals. That keeps the checkout honest and prevents dead-end payment choices later.'
                      : 'Only payment methods allowed for this order type appear here, so customers can move forward without second-guessing what will work.'}
                  />
                </div>
              )}

              {/* Step 0 — Contact */}
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-xl text-earth-900 font-semibold">
                      Contact Details
                    </h2>
                    <p className="text-earth-700 text-sm font-body mt-1">
                      We'll use this to confirm your order
                    </p>
                  </div>
                  <Field label="Full Name" required error={errors.name}>
                    <Input placeholder="John Kamau" value={form.name}
                      onChange={e => set('name', e.target.value)}
                      error={errors.name} autoFocus />
                  </Field>
                  <Field label="Phone Number" required error={errors.phone}>
                    <Input type="tel" placeholder="0712 345 678" value={form.phone}
                      onChange={e => set('phone', e.target.value)} error={errors.phone} />
                  </Field>
                  <Field label="Email Address">
                    <Input type="email" placeholder="john@example.com (optional)"
                      value={form.email} onChange={e => set('email', e.target.value)} />
                  </Field>
                </div>
              )}

              {/* Step 1 — Delivery */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-xl text-earth-900 font-semibold">
                      Delivery Method
                    </h2>
                    <p className="text-earth-700 text-sm font-body mt-1">
                      How would you like to receive your order?
                    </p>
                  </div>
                  <div className="space-y-3">
                    <OptionCard icon={Store} label="Pickup from Shop"
                      desc="Collect your order from our location in Bungoma"
                      checked={form.deliveryMethod === 'pickup'}
                      onChange={() => handleDeliveryMethodChange('pickup')} />
                    <OptionCard icon={Truck} label="Home Delivery"
                      desc="We bring your order directly to your door"
                      checked={form.deliveryMethod === 'delivery'}
                      onChange={() => handleDeliveryMethodChange('delivery')}
                      disabled={locationFeeData?.deliveryAvailable === false}
                      disabledReason={`We don't deliver to your area (${locationFeeData?.distanceKm} km away) — you can still place a pickup order`} />
                  </div>
                  {form.deliveryMethod === 'delivery' && (
                    <>
                      {/* ── Distance-based fee detection ───────────────── */}
                      {orderSettings.deliveryPricingMode === 'distance' && (
                        <div className="rounded-xl border border-earth-200 bg-earth-50 p-4 space-y-3">
                          <p className="text-xs font-body font-semibold text-earth-600 uppercase tracking-wide">
                            Delivery Fee
                          </p>
                          {locationFeeData ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Navigation size={14} className="text-green-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-body font-semibold text-earth-800">
                                    {formatKES(locationFeeData.fee)}
                                    {locationFeeData.zoneName && (
                                      <span className="text-earth-600 font-normal"> · {locationFeeData.zoneName}</span>
                                    )}
                                  </p>
                                  {locationFeeData.distanceKm != null && (
                                    <p className="text-xs font-body text-earth-700">
                                      ~{locationFeeData.distanceKm} km from our shop
                                    </p>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={clearLocation}
                                className="p-1.5 text-earth-400 hover:text-red-500 transition-colors"
                                title="Clear location"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs font-body text-earth-700">
                                Share your location to get the exact delivery fee for your area.
                              </p>
                              <button
                                type="button"
                                onClick={detectLocation}
                                disabled={locating}
                                className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white
                                  rounded-xl text-sm font-body font-semibold hover:bg-brand-600
                                  disabled:opacity-60 transition-colors"
                              >
                                {locating
                                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Detecting…</>
                                  : <><Navigation size={14} /> Use My Location</>
                                }
                              </button>
                              {orderSettings.deliveryFee > 0 && (
                                <p className="text-xs font-body text-earth-400">
                                  Or skip — standard fee of {formatKES(orderSettings.deliveryFee)} applies
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {/* ── Delivery address ──────────────────────────── */}
                      <Field label="Delivery Address" required error={errors.deliveryAddress}>
                        <textarea rows={3}
                          placeholder="Building name, street, area, town…"
                          value={form.deliveryAddress}
                          onChange={e => set('deliveryAddress', e.target.value)}
                          className={`w-full border rounded-xl px-4 py-3 text-sm font-body
                            text-earth-800 placeholder-earth-400 focus:outline-none focus:ring-2
                            focus:border-transparent transition-all bg-earth-50 resize-none ${
                              errors.deliveryAddress
                                ? 'border-red-300 focus:ring-red-300'
                                : 'border-earth-200 focus:ring-brand-400'
                            }`}
                        />
                        {errors.deliveryAddress && (
                          <p className="text-red-500 text-xs mt-1.5 font-body">
                            {errors.deliveryAddress}
                          </p>
                        )}
                      </Field>
                    </>
                  )}
                  <Field label="Special Instructions">
                    <textarea rows={2}
                      placeholder="Any notes for your order… (optional)"
                      value={form.specialInstructions}
                      onChange={e => set('specialInstructions', e.target.value)}
                      className="w-full border border-earth-200 rounded-xl px-4 py-3 text-sm
                        font-body text-earth-800 placeholder-earth-400 focus:outline-none
                        focus:ring-2 focus:ring-brand-400 focus:border-transparent
                        transition-all bg-earth-50 resize-none"
                    />
                  </Field>
                </div>
              )}

              {/* Step 2 — Payment */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-xl text-earth-900 font-semibold">
                      Payment Method
                    </h2>
                    <p className="text-earth-700 text-sm font-body mt-1">
                      How would you like to pay?
                    </p>
                  </div>
                  <div className="space-y-3">
                    {availablePaymentOptions.map(option => (
                      <OptionCard
                        key={option.value}
                        icon={option.icon}
                        label={option.label}
                        desc={option.desc}
                        badge={option.badge}
                        checked={form.paymentMethod === option.value}
                        onChange={() => {
                          set('paymentMethod', option.value)
                          if (option.value === 'mpesa' && !form.mpesaPhone && form.phone) {
                            set('mpesaPhone', form.phone)
                          }
                        }}
                      />
                    ))}
                    {availablePaymentOptions.length === 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-sm text-red-700 font-body">
                          No payment methods are currently available for this order type.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* M-Pesa phone input */}
                  {form.paymentMethod === 'mpesa' && (
                    <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-body font-semibold text-brand-700 uppercase
                        tracking-wide">M-Pesa Number</p>
                      <Field label="Phone to receive STK push" error={errors.mpesaPhone}>
                        <Input
                          type="tel"
                          placeholder="0712 345 678"
                          value={form.mpesaPhone}
                          onChange={e => set('mpesaPhone', e.target.value)}
                          error={errors.mpesaPhone}
                        />
                      </Field>
                      <p className="text-xs text-brand-600 font-body">
                        You'll receive a payment prompt on this number. Enter your M-Pesa PIN to
                        complete the payment.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 — Review */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-xl text-earth-900 font-semibold">
                      Review Order
                    </h2>
                    <p className="text-earth-700 text-sm font-body mt-1">
                      Check everything looks right before confirming
                    </p>
                  </div>

                  {[
                    {
                      label: 'Contact', step: 0,
                      content: (
                        <p className="text-sm text-earth-700 font-body">
                          {form.name} · {form.phone}
                        </p>
                      )
                    },
                    {
                      label: 'Delivery', step: 1,
                      content: (
                        <>
                          <p className="text-sm text-earth-700 font-body capitalize">
                            {form.deliveryMethod === 'pickup' ? 'Pickup from shop' : 'Home delivery'}
                          </p>
                          {form.deliveryAddress && (
                            <p className="text-xs text-earth-700 mt-0.5 font-body">
                              {form.deliveryAddress}
                            </p>
                          )}
                        </>
                      )
                    },
                    {
                      label: 'Payment', step: 2,
                      content: (
                        <>
                          <p className="text-sm text-earth-700 font-body">
                            {PAYMENT_LABELS[form.paymentMethod]}
                          </p>
                          {form.paymentMethod === 'mpesa' && (
                            <p className="text-xs text-earth-700 mt-0.5 font-body">
                              STK push to {form.mpesaPhone}
                            </p>
                          )}
                        </>
                      )
                    },
                  ].map(row => (
                    <div key={row.label} className="bg-earth-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-body font-semibold text-earth-700
                          uppercase tracking-wide">
                          {row.label}
                        </span>
                        <button onClick={() => setStep(row.step)}
                          className="text-xs text-brand-600 hover:text-brand-700 font-body
                            font-medium transition-colors">
                          Edit
                        </button>
                      </div>
                      {row.content}
                    </div>
                  ))}

                  <div>
                    <p className="text-xs font-body font-semibold text-earth-700 uppercase
                      tracking-wide mb-3">
                      Items ({items.length})
                    </p>
                    <div className="space-y-2">
                      {items.map(item => (
                        <div key={item.key} className="flex justify-between items-start text-sm">
                          <div className="min-w-0 pr-4">
                            <span className="text-earth-800 font-body font-medium">
                              {item.productName}
                            </span>
                            <span className="text-earth-700 font-body">
                              {' '}· {item.variety} · {item.packaging} ×{item.quantity}
                            </span>
                          </div>
                          <span className="text-earth-900 font-medium font-body flex-shrink-0">
                            {formatKES(item.priceKES * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4 — Confirm */}
              {step === 4 && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center
                    justify-center mx-auto">
                    <ShoppingBag size={28} className="text-brand-600" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl text-earth-900 font-semibold mb-1">
                      Ready to place your order?
                    </h2>
                    <p className="text-earth-400 text-sm font-body">
                      {form.paymentMethod === 'mpesa'
                        ? `You'll receive an M-Pesa prompt on ${form.mpesaPhone}`
                        : `We'll confirm within 2 hours at ${form.phone}`
                      }
                    </p>
                  </div>
                  <div className="bg-earth-50 rounded-xl p-4 text-left space-y-2">
                    <div className="flex justify-between text-sm font-body">
                      <span className="text-earth-700">Subtotal</span>
                      <span className="text-earth-700">{formatKES(total)}</span>
                    </div>
                    {form.deliveryMethod === 'delivery' && (
                      <div className="flex justify-between text-sm font-body">
                        <span className="text-earth-700">
                          Delivery Fee
                          {locationFeeData?.distanceKm != null && (
                            <span className="text-earth-400 text-xs ml-1">
                              (~{locationFeeData.distanceKm} km)
                            </span>
                          )}
                        </span>
                        <span className="text-earth-700">{formatKES(deliveryFee)}</span>
                      </div>
                    )}
                    {vatEnabled && (
                      <div className="flex justify-between text-sm font-body">
                        <span className="text-earth-700">VAT ({vatRate}%)</span>
                        <span className="text-earth-700">{formatKES(vatAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-body">
                      <span className="text-earth-700">Payment</span>
                      <span className="text-earth-700">{PAYMENT_LABELS[form.paymentMethod]}</span>
                    </div>
                    <div className="flex justify-between text-sm font-body border-t
                      border-earth-100 pt-2 mt-2">
                      <span className="font-semibold text-earth-800">Total</span>
                      <span className="font-display font-bold text-brand-600 text-lg">
                        {formatKES(orderTotal)}
                      </span>
                    </div>
                  </div>

                  {belowMinimum && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-xs text-red-700 font-body text-center">
                        Minimum order value is <strong>{formatKES(orderSettings.minimumOrderValue)}</strong>.
                      </p>
                    </div>
                  )}

                  {/* M-Pesa notice */}
                  {form.paymentMethod === 'mpesa' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <p className="text-xs text-blue-700 font-body text-center">
                        After placing your order, an M-Pesa STK push will be sent to{' '}
                        <strong>{form.mpesaPhone}</strong>. Keep your phone ready.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Navigation ───────────────────────────────────────── */}
              <div className="flex justify-between mt-6 pt-5 border-t border-earth-100">
                {step > 0 ? (
                  <button onClick={back}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-body
                      text-earth-600 hover:text-earth-900 hover:bg-earth-100 rounded-xl
                      transition-colors">
                    <ArrowLeft size={15} /> Back
                  </button>
                ) : <div />}

                {step < 3 && (
                  <button onClick={next}
                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-700 text-white
                      rounded-xl text-sm font-body font-semibold hover:bg-brand-800
                      transition-all active:scale-[0.98]">
                    Continue <ArrowRight size={15} />
                  </button>
                )}
                {step === 3 && (
                  <button onClick={next}
                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-700 text-white
                      rounded-xl text-sm font-body font-semibold hover:bg-brand-800
                      transition-all active:scale-[0.98]">
                    Review & Confirm <ArrowRight size={15} />
                  </button>
                )}
                {step === 4 && (
                  <button onClick={submit} disabled={loading}
                    className="flex items-center gap-2 px-8 py-3 bg-brand-500 text-white
                      rounded-xl text-sm font-body font-bold hover:bg-brand-600 transition-all
                      active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed
                      shadow-warm">
                        {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent
                          rounded-full animate-spin" />
                        {form.paymentMethod === 'mpesa' ? 'Processing…' : 'Placing Order…'}
                      </>
                        ) : (
                          <>
                            {form.paymentMethod === 'mpesa'
                          ? `Pay ${formatKES(orderTotal)} via M-Pesa`
                          : `Place Order · ${formatKES(orderTotal)}`
                        }
                          </>
                        )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Order summary sidebar ──────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-earth-100 shadow-sm p-5 sticky top-6">
              <h3 className="font-display font-semibold text-earth-900 mb-4">Order Summary</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {items.map(item => (
                  <div key={item.key} className="flex gap-3">
                    <div className="w-10 h-10 bg-earth-50 rounded-lg overflow-hidden flex-shrink-0">
                      {item.imageURL ? (
                        <img src={getOptimizedImageUrl(item.imageURL, { width: 96, height: 96 })}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">
                          🌾
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-body font-medium text-earth-800 truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-earth-700 font-body">
                        {item.variety} · {item.packaging}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-body font-semibold text-earth-800">
                        {formatKES(item.priceKES * item.quantity)}
                      </p>
                      <p className="text-xs text-earth-400">×{item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-earth-100 mt-4 pt-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-body text-earth-600">Subtotal</span>
                  <span className="font-body text-earth-700">{formatKES(total)}</span>
                </div>
                {form.deliveryMethod === 'delivery' && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-body text-earth-600">
                      Delivery Fee
                      {locationFeeData?.distanceKm != null && (
                        <span className="text-earth-400 text-xs ml-1">~{locationFeeData.distanceKm} km</span>
                      )}
                    </span>
                    <span className="font-body text-earth-700">
                      {locating
                        ? <span className="text-earth-400 text-xs">detecting…</span>
                        : formatKES(deliveryFee)
                      }
                    </span>
                  </div>
                )}
                {vatEnabled && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-body text-earth-600">VAT ({vatRate}%)</span>
                    <span className="font-body text-earth-700">{formatKES(vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-body text-earth-600 text-sm">Total</span>
                  <span className="font-display font-bold text-brand-600 text-lg">
                    {formatKES(orderTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
