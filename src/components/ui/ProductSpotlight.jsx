import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { formatKES } from '../../utils/helpers'
import { getOptimizedImageUrl } from '../../utils/image'
import { safeSession } from '../../utils/safeStorage'

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
    const count = Number(safeSession.get(SESSION_KEY) || 0)
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
    const count = Number(safeSession.get(SESSION_KEY) || 0) + 1
    safeSession.set(SESSION_KEY, String(count))

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

  return (
    <>
    {/* One compact pill at every size, bottom-left: the old 320px card sat on top of the hero
        headline on phones and over the photo mosaic on desktop. */}
    <div
      className={`fixed bottom-4 left-3 right-[4.5rem] sm:left-6 sm:right-auto sm:w-[26rem] z-40 transition-all duration-500 ease-out
        ${entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
      data-testid="spotlight-pill"
    >
      <div className="flex items-center gap-2 bg-white rounded-2xl border border-earth-100 shadow-[0_8px_30px_rgba(0,0,0,0.18)] pl-2 pr-1 py-1.5">
        <Link to={`/shop/${product._id}`} onClick={handleDismiss} className="flex items-center gap-2.5 flex-1 min-w-0">
          <img src={getOptimizedImageUrl(image, { width: 96, height: 96 })} alt="" width="40" height="40"
            className="w-10 h-10 rounded-xl object-cover flex-shrink-0" loading="lazy" decoding="async" />
          <span className="min-w-0">
            <span className="block text-[10px] font-admin font-semibold uppercase tracking-wide text-brand-700">Today&apos;s pick</span>
            <span className="block text-sm font-body font-semibold text-earth-900 truncate">{product.name}</span>
            <span className="block text-xs font-body text-earth-700">from {formatKES(pricing.price)} / {pricing.size}</span>
          </span>
        </Link>
        <button type="button" onClick={handleDismiss} aria-label="Close today's pick"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-earth-500 hover:bg-earth-100">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>

    </>
  )
}
