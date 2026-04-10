import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { X, ChevronRight, Sparkles, Tag } from 'lucide-react'
import { formatKES } from '../../utils/helpers'
import { getOptimizedImageUrl } from '../../utils/image'

const MAX_DISMISSALS = 3
const SESSION_KEY = 'spotlight_dismissals'

const getLowestPrice = (product) => {
  for (const variety of product.varieties || []) {
    for (const pkg of variety.packaging || []) {
      if (!pkg.quoteOnly && pkg.priceKES) return { price: pkg.priceKES, size: pkg.size }
    }
  }
  return null
}

const getProductImage = (product) => {
  for (const variety of product.varieties || []) {
    if (variety.imageURLs?.[0]) return variety.imageURLs[0]
  }
  return product.imageURLs?.[0] || null
}

export default function ProductSpotlight({ products = [] }) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [current, setCurrent] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [entered, setEntered] = useState(false)

  const eligible = products.filter(p => getLowestPrice(p) && getProductImage(p))

  // Check session dismissal count on mount — if already hit limit, never show
  useEffect(() => {
    const count = Number(sessionStorage.getItem(SESSION_KEY) || 0)
    if (count >= MAX_DISMISSALS) setDismissed(true)
  }, [])

  const next = useCallback(() => {
    if (eligible.length <= 1) return
    setAnimating(true)
    setTimeout(() => {
      setCurrent(i => (i + 1) % eligible.length)
      setAnimating(false)
    }, 350)
  }, [eligible.length])

  // Show after 2 seconds
  useEffect(() => {
    if (eligible.length === 0 || dismissed) return
    const t = setTimeout(() => {
      setVisible(true)
      setTimeout(() => setEntered(true), 50)
    }, 2000)
    return () => clearTimeout(t)
  }, [eligible.length, dismissed])

  // Cycle every 8 seconds
  useEffect(() => {
    if (!visible || dismissed) return
    const interval = setInterval(next, 8000)
    return () => clearInterval(interval)
  }, [visible, dismissed, next])

  const handleDismiss = () => {
    // Increment session dismissal count
    const count = Number(sessionStorage.getItem(SESSION_KEY) || 0) + 1
    sessionStorage.setItem(SESSION_KEY, count)

    setEntered(false)
    setTimeout(() => {
      setVisible(false)

      if (count >= MAX_DISMISSALS) {
        // Hit the limit — never show again this session
        setDismissed(true)
      } else {
        // Still has dismissals left — show again after 45 seconds
        const remaining = MAX_DISMISSALS - count
        setTimeout(() => {
          if (remaining > 0) {
            setVisible(true)
            // Pick next random product
            setCurrent(i => (i + 1) % eligible.length)
            setTimeout(() => setEntered(true), 50)
          }
        }, 45000)
      }
    }, 400)
  }

  if (!visible || eligible.length === 0) return null

  const product = eligible[current]
  const pricing = getLowestPrice(product)
  const image = getProductImage(product)
  const dismissalsLeft = MAX_DISMISSALS - Number(sessionStorage.getItem(SESSION_KEY) || 0)

  return (
    <div
      className={`fixed top-20 right-4 sm:right-6 z-40 w-72 sm:w-80 transition-all duration-500 ease-out
        ${entered ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}
    >
      <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] border border-earth-100 overflow-hidden">

        {/* Header bar */}
        <div className="bg-brand-700 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-brand-200" />
            <span className="text-xs font-admin font-semibold text-white tracking-wide uppercase">
              Today's Pick
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {Array.from({ length: MAX_DISMISSALS }).map((_, i) => (
                <div key={i}
                  className={`w-1 h-1 rounded-full transition-colors ${
                    i < dismissalsLeft ? 'bg-brand-300' : 'bg-brand-900'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full hover:bg-brand-800 text-brand-200 hover:text-white transition-colors"
              title={dismissalsLeft <= 1 ? "Close (won't show again)" : `Close (${dismissalsLeft - 1} more time${dismissalsLeft - 1 !== 1 ? 's' : ''} remaining)`}
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Product content */}
        <div className={`transition-all duration-350 ${animating ? 'opacity-0 translate-x-3' : 'opacity-100 translate-x-0'}`}>
          <Link to={`/shop/${product._id}`} onClick={handleDismiss} className="block">
            {/* Image */}
            <div className="relative h-36 bg-earth-50 overflow-hidden">
              <img
                src={getOptimizedImageUrl(image, { width: 640, height: 360 })}
                alt={product.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute top-2 left-2">
                <span className="bg-white/90 backdrop-blur-sm text-earth-700 text-xs font-admin font-medium px-2 py-1 rounded-full">
                  {product.category}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="px-4 py-3">
              <h3 className="font-display font-semibold text-earth-900 text-base leading-tight">
                {product.name}
              </h3>
              {product.description && (
                <p className="text-earth-500 text-xs font-body mt-1 leading-relaxed line-clamp-2">
                  {product.description}
                </p>
              )}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1.5">
                  <Tag size={12} className="text-brand-500" />
                  <div>
                    <span className="text-xs text-earth-400 font-body">from </span>
                    <span className="text-brand-600 font-display font-bold text-sm">
                      {formatKES(pricing.price)}
                    </span>
                    <span className="text-earth-400 text-xs font-body"> / {pricing.size}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-brand-600 text-xs font-body font-medium">
                  View <ChevronRight size={13} />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Product dots */}
        {eligible.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pb-3">
            {eligible.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setAnimating(true)
                  setTimeout(() => { setCurrent(i); setAnimating(false) }, 350)
                }}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? 'w-4 h-1.5 bg-brand-500'
                    : 'w-1.5 h-1.5 bg-earth-200 hover:bg-earth-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
