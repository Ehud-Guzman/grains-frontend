import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Plus, Minus, ShoppingCart, Phone, Check, Tag, ChevronRight,
  Bell, BellOff, TrendingDown, Clock, List
} from 'lucide-react'
import toast from 'react-hot-toast'
import { productService } from '../../services/product.service'
import { customerAlertService } from '../../services/customerAlert.service'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useShopInfo } from '../../context/AppSettingsContext'
import { formatKES } from '../../utils/helpers'
import { STOCK_CONFIG, CART_FEEDBACK_DELAY_MS } from '../../utils/constants'
import Spinner from '../../components/ui/Spinner'
import AddToListModal from '../../components/lists/AddToListModal'
import { getOptimizedImageUrl } from '../../utils/image'

// Chart is lazy — keeps recharts (~380KB) out of the product-page path until
// there's actually history to draw.
const PriceHistoryChart = lazy(() => import('../../components/products/PriceHistoryChart'))

// ── SUGGESTED PRODUCT CARD ────────────────────────────────────────────────────
function SuggestedCard({ product }) {
  const firstVariety  = product.varieties?.[0]
  const firstPkg      = firstVariety?.packaging?.find(p => !p.quoteOnly && p.priceKES)
  const image         = firstVariety?.imageURLs?.[0] || product.imageURLs?.[0]
  const lowestPrice   = product.varieties
    ?.flatMap(v => v.packaging?.filter(p => !p.quoteOnly && p.priceKES) || [])
    .map(p => p.priceKES)
    .sort((a, b) => a - b)[0]

  return (
    <Link to={`/shop/${product._id}`}
      className="flex-shrink-0 w-36 sm:w-44 group">
      {/* Image */}
      <div className="w-full aspect-square rounded-2xl overflow-hidden bg-earth-100 mb-2.5
        border border-earth-100 relative">
        {image ? (
          <img src={getOptimizedImageUrl(image, { width: 320, height: 320 })}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            decoding="async" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl opacity-20">🌾</span>
          </div>
        )}
        {/* Category pill */}
        <div className="absolute bottom-2 left-2">
          <span className="text-xs font-body font-medium text-earth-600 bg-white/90
            backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/50">
            {product.category}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="px-0.5">
        <p className="font-body font-bold text-earth-800 text-sm leading-tight
          group-hover:text-brand-600 transition-colors line-clamp-1">
          {product.name}
        </p>
        {firstVariety?.varietyName !== product.name && (
          <p className="text-earth-600 text-xs font-body mt-0.5 line-clamp-1">
            {firstVariety?.varietyName}
          </p>
        )}
        <p className="text-brand-600 font-display font-bold text-sm mt-1">
          {lowestPrice ? `From ${formatKES(lowestPrice)}` : 'Quote only'}
        </p>
      </div>
    </Link>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ProductPage() {
  const shopInfo = useShopInfo()
  const { id } = useParams()
  const { addItem } = useCart()
  const { user } = useAuth()
  const scrollRef = useRef()

  const [product, setProduct]           = useState(null)
  const [suggested, setSuggested]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [selectedVariety, setSelectedVariety] = useState(0)
  const [selectedPkg, setSelectedPkg]   = useState(0)
  const [quantity, setQuantity]         = useState(1)
  const [activeImage, setActiveImage]   = useState(0)
  const [added, setAdded]               = useState(false)
  const [priceHistory, setPriceHistory] = useState([])
  const [priceRange, setPriceRange]     = useState('3m')
  const [bestTime, setBestTime]         = useState(null)
  const [myAlerts, setMyAlerts]         = useState([])
  const [alertLoading, setAlertLoading] = useState(false)
  const [showAddToList, setShowAddToList] = useState(false)

  useEffect(() => {
    setLoading(true)
    setSelectedVariety(0)
    setSelectedPkg(0)
    setQuantity(1)
    setActiveImage(0)
    setAdded(false)
    setPriceHistory([])
    setPriceRange('3m')
    setBestTime(null)

    productService.getById(id)
      .then(res => {
        const p = res.data.data
        setProduct(p)
        return productService.getAll({ category: p.category, limit: 8, isActive: true })
          .then(r => {
            const others = (r.data.data || []).filter(x => x._id !== id)
            setSuggested(others.slice(0, 6))
          })
          .catch(() => {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  // Fetch price history + best-time badge whenever variety/packaging selection changes
  useEffect(() => {
    if (!product) return
    const v = product.varieties?.[selectedVariety]
    const pkg = v?.packaging?.[selectedPkg]
    if (!v || !pkg) return

    productService.getPriceHistory(id, v.varietyName, pkg.size)
      .then(res => {
        const logs = res.data?.data || []
        setPriceHistory([...logs].reverse()) // oldest → newest, keep all 200
      })
      .catch(() => {})

    if (pkg.priceKES) {
      productService.getBestTimeBadge(id, v.varietyName, pkg.size, pkg.priceKES)
        .then(res => setBestTime(res.data?.data || null))
        .catch(() => {})
    }
  }, [id, product, selectedVariety, selectedPkg])

  // Fetch the customer's own alerts for this product (only if logged in as customer)
  useEffect(() => {
    if (!user || user.role !== 'customer') return
    customerAlertService.getMyAlerts()
      .then(res => setMyAlerts(res.data?.data || []))
      .catch(() => {})
  }, [user])

  const isAlertActive = (type) => {
    if (!product) return false
    const v = product.varieties?.[selectedVariety]
    const pkg = v?.packaging?.[selectedPkg]
    return myAlerts.some(a =>
      a.type === type &&
      a.productId === id &&
      a.varietyName === v?.varietyName &&
      a.packaging === pkg?.size &&
      a.isActive
    )
  }

  const handleToggleAlert = async (type) => {
    if (!user || user.role !== 'customer') {
      toast('Log in to set up alerts', { icon: '🔒' })
      return
    }
    const v = product.varieties?.[selectedVariety]
    const pkg = v?.packaging?.[selectedPkg]
    if (!v || !pkg) return

    const existing = myAlerts.find(a =>
      a.type === type && a.productId === id &&
      a.varietyName === v.varietyName && a.packaging === pkg.size && a.isActive
    )

    setAlertLoading(true)
    try {
      if (existing) {
        await customerAlertService.unsubscribe(existing._id)
        setMyAlerts(prev => prev.map(a => a._id === existing._id ? { ...a, isActive: false } : a))
        toast.success('Alert removed')
      } else {
        const res = await customerAlertService.subscribe({
          type,
          productId: id,
          productName: product.name,
          varietyName: v.varietyName,
          packaging: pkg.size,
          priceAtSubscription: type === 'price_drop' ? pkg.priceKES : undefined,
        })
        setMyAlerts(prev => [...prev, res.data.data])
        toast.success(type === 'back_in_stock' ? 'We\'ll notify you when it\'s back!' : 'Price drop alert set!')
      }
    } catch {
      toast.error('Could not update alert')
    } finally {
      setAlertLoading(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  if (!product) return (
    <div className="container-page py-16 text-center">
      <p className="text-earth-500 font-body mb-4">Product not found.</p>
      <Link to="/shop" className="btn-primary">Back to Shop</Link>
    </div>
  )

  const variety    = product.varieties?.[selectedVariety]
  const packaging  = variety?.packaging?.[selectedPkg]
  const images     = [...(variety?.imageURLs || []), ...(product.imageURLs || [])].filter(Boolean)
  const isQuoteOnly = packaging?.quoteOnly
  const inStock    = packaging?.stock > 0 && !isQuoteOnly
  const maxQty     = packaging?.stock || 0

  const stockStatus = !packaging ? null
    : packaging.stock === 0 ? 'out'
    : packaging.stock <= (packaging.lowStockThreshold || 10) ? 'low'
    : 'in'

  const stockConfig = STOCK_CONFIG[stockStatus] || {}

  const handleAddToCart = () => {
    if (!variety || !packaging || isQuoteOnly || !inStock || added) return
    addItem(product, variety, packaging, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), CART_FEEDBACK_DELAY_MS)
  }

  const handleAddToList = () => {
    if (!user || user.role !== 'customer') {
      toast('Log in to save items to a list', { icon: '🔒' })
      return
    }
    if (!variety || !packaging) return
    setShowAddToList(true)
  }

  const switchVariety = (i) => {
    setSelectedVariety(i)
    setSelectedPkg(0)
    setActiveImage(0)
    setQuantity(1)
  }

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Breadcrumb ────────────────────────────────────────────── */}
      <div className="border-b border-earth-100 bg-white">
        <div className="container-page py-3">
          <div className="flex items-center gap-2 text-sm font-body text-earth-600">
            <Link to="/shop" className="hover:text-brand-600 transition-colors flex items-center gap-1">
              <ArrowLeft size={14} /> Shop
            </Link>
            <span>/</span>
            <span className="text-earth-600">{product.category}</span>
            <span>/</span>
            <span className="text-earth-800 font-medium truncate">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="container-page py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

          {/* ── Images ─────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="aspect-square bg-earth-50 rounded-2xl overflow-hidden relative group">
              {images.length > 0 ? (
                <img src={getOptimizedImageUrl(images[activeImage], { width: 1000, height: 1000, fit: 'limit' })}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700
                    group-hover:scale-105"
                  fetchpriority="high"
                  decoding="async" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-8xl opacity-10">🌾</span>
                </div>
              )}
              <div className="absolute top-4 left-4">
                <span className="bg-white/90 backdrop-blur-sm text-earth-600 text-xs font-body
                  font-medium px-3 py-1.5 rounded-full border border-white/50 shadow-sm">
                  {product.category}
                </span>
              </div>
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2
                      transition-all ${i === activeImage
                        ? 'border-brand-500 scale-105'
                        : 'border-transparent opacity-70 hover:opacity-100'}`}>
                    <img src={getOptimizedImageUrl(img, { width: 128, height: 128 })}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Details ─────────────────────────────────────────────── */}
          <div className="space-y-5">
            <div>
              <p className="text-earth-600 text-xs font-body uppercase tracking-widest mb-1.5">
                {product.category}
              </p>
              <h1 className="font-display text-3xl text-earth-900 font-bold leading-tight mb-2">
                {product.name}
              </h1>
              {product.description && (
                <p className="text-earth-700 font-body leading-relaxed">{product.description}</p>
              )}
            </div>

            {/* Variety selector */}
            {product.varieties?.length > 1 && (
              <div>
                <p className="text-xs font-body font-semibold text-earth-800 uppercase
                  tracking-wide mb-2">Variety</p>
                <div className="flex flex-wrap gap-2">
                  {product.varieties.map((v, i) => (
                    <button key={v.varietyName} onClick={() => switchVariety(i)}
                      className={`px-4 py-2 rounded-xl border text-sm font-body font-medium
                        transition-all ${i === selectedVariety
                          ? 'bg-brand-700 text-white border-brand-700 shadow-sm'
                          : 'bg-white text-earth-700 border-earth-200 hover:border-earth-400'}`}>
                      {v.varietyName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Packaging selector */}
            {variety?.packaging?.length > 0 && (
              <div>
                <p className="text-xs font-body font-semibold text-earth-800 uppercase
                  tracking-wide mb-2">Packaging Size</p>
                <div className="flex flex-wrap gap-2">
                  {variety.packaging.map((pkg, i) => (
                    <button key={pkg.size} onClick={() => { setSelectedPkg(i); setQuantity(1) }}
                      className={`px-4 py-3 rounded-xl border text-sm font-body transition-all text-left ${
                        i === selectedPkg
                          ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                          : 'bg-white text-earth-700 border-earth-200 hover:border-brand-300'}`}>
                      <span className="font-semibold block">{pkg.size}</span>
                      <span className={`text-xs ${i === selectedPkg ? 'text-white/80' : 'text-earth-400'}`}>
                        {pkg.quoteOnly ? 'Quote only' : formatKES(pkg.priceKES)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price + stock */}
            {packaging && (
              <div className="space-y-1.5 py-1">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-brand-400" />
                    <span className="font-display text-2xl text-brand-600 font-bold">
                      {isQuoteOnly ? 'Quote only' : formatKES(packaging.priceKES)}
                    </span>
                  </div>
                  {stockStatus && (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-body font-semibold
                      px-2.5 py-1 rounded-full border ${stockConfig.badge} ${stockConfig.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${stockConfig.dot}`} />
                      {stockConfig.label}
                    </span>
                  )}
                  {bestTime?.isBestTime && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-body font-semibold
                      px-2.5 py-1 rounded-full border border-green-200 bg-green-50 text-green-700">
                      <TrendingDown size={12} /> Best price in 90 days
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Volume pricing tiers */}
            {packaging?.pricingTiers?.length > 0 && !isQuoteOnly && (
              <div className="bg-earth-50 border border-earth-200 rounded-xl p-3.5">
                <p className="text-xs font-body font-semibold text-earth-700 uppercase tracking-wide mb-2">
                  Volume Pricing
                </p>
                <div className="space-y-1.5">
                  {[{ minQty: 1, priceKES: packaging.priceKES, isBase: true },
                    ...[...packaging.pricingTiers].sort((a, b) => a.minQty - b.minQty)
                  ].map((tier, i) => (
                    <div key={i} className={`flex justify-between text-sm font-body px-2 py-1 rounded-lg
                      ${quantity >= tier.minQty ? 'bg-brand-50 border border-brand-200 text-brand-800' : 'text-earth-600'}`}>
                      <span>{tier.isBase ? '1+' : `${tier.minQty}+`} units</span>
                      <span className="font-bold">{formatKES(tier.priceKES)} each</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quote only CTA */}
            {isQuoteOnly ? (
              <a href={`tel:${shopInfo.phone}`}
                className="flex items-center justify-center gap-2 w-full py-4 bg-brand-700
                  text-white rounded-xl font-body font-semibold hover:bg-brand-800 transition-all
                  active:scale-[0.98] text-base">
                <Phone size={18} /> Request a Quote
              </a>
            ) : (
              <>
                {/* Quantity */}
                <div className="flex items-center gap-4">
                  <p className="text-xs font-body font-semibold text-earth-600 uppercase tracking-wide">
                    Quantity
                  </p>
                  <div className="flex items-center gap-1 bg-earth-50 rounded-xl border border-earth-200 p-1">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-9 h-9 rounded-lg bg-white border border-earth-200 flex items-center
                        justify-center hover:bg-earth-100 transition-colors shadow-sm">
                      <Minus size={14} className="text-earth-600" />
                    </button>
                    <span className="w-10 text-center font-body font-bold text-earth-900">
                      {quantity}
                    </span>
                    <button onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                      disabled={quantity >= maxQty}
                      className="w-9 h-9 rounded-lg bg-white border border-earth-200 flex items-center
                        justify-center hover:bg-earth-100 transition-colors shadow-sm
                        disabled:opacity-40 disabled:cursor-not-allowed">
                      <Plus size={14} className="text-earth-600" />
                    </button>
                  </div>
                  {packaging && inStock && (
                    <p className="text-xs text-earth-600 font-body">{packaging.stock} available</p>
                  )}
                </div>

                {inStock && packaging?.priceKES && (() => {
                  const tiers = packaging.pricingTiers || []
                  const sorted = [...tiers].sort((a, b) => b.minQty - a.minQty)
                  const activeTier = sorted.find(t => quantity >= t.minQty)
                  const unitPrice = activeTier ? activeTier.priceKES : packaging.priceKES
                  return (
                    <p className="text-sm font-body text-earth-700">
                      Total: <span className="font-display font-bold text-earth-900 text-base">
                        {formatKES(unitPrice * quantity)}
                      </span>
                      {activeTier && (
                        <span className="text-xs text-green-600 font-body ml-2">
                          ({formatKES(unitPrice)} × {quantity})
                        </span>
                      )}
                    </p>
                  )
                })()}

                <div className="flex gap-2">
                  <button onClick={handleAddToCart} disabled={!inStock || added}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl
                      font-body font-semibold text-base transition-all active:scale-[0.98] ${
                        added ? 'bg-green-500 text-white'
                        : inStock ? 'bg-brand-700 text-white hover:bg-brand-800'
                        : 'bg-earth-100 text-earth-400 cursor-not-allowed'}`}>
                    {added
                      ? <><Check size={18} /> Added to Cart!</>
                      : <><ShoppingCart size={18} /> {inStock ? 'Add to Cart' : 'Out of Stock'}</>
                    }
                  </button>
                  <button onClick={handleAddToList} title="Save to list"
                    className="flex-shrink-0 w-14 flex items-center justify-center rounded-xl
                      border-2 border-earth-200 text-earth-600 hover:border-brand-300
                      hover:text-brand-700 hover:bg-brand-50 transition-all active:scale-[0.98]">
                    <List size={18} />
                  </button>
                </div>

                {/* Out-of-stock alert */}
                {!inStock && !isQuoteOnly && (
                  <button
                    onClick={() => handleToggleAlert('back_in_stock')}
                    disabled={alertLoading}
                    className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl
                      font-body font-semibold text-sm transition-all border ${
                        isAlertActive('back_in_stock')
                          ? 'border-earth-300 bg-earth-50 text-earth-600'
                          : 'border-brand-300 bg-white text-brand-700 hover:bg-brand-50'}`}>
                    {isAlertActive('back_in_stock')
                      ? <><BellOff size={15} /> Remove back-in-stock alert</>
                      : <><Bell size={15} /> Notify me when back in stock</>}
                  </button>
                )}

                {/* Price drop alert */}
                {inStock && !isQuoteOnly && packaging?.priceKES && (
                  <button
                    onClick={() => handleToggleAlert('price_drop')}
                    disabled={alertLoading}
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                      font-body text-sm transition-all border ${
                        isAlertActive('price_drop')
                          ? 'border-earth-200 bg-earth-50 text-earth-500'
                          : 'border-earth-200 bg-white text-earth-600 hover:border-brand-300 hover:text-brand-700'}`}>
                    {isAlertActive('price_drop')
                      ? <><BellOff size={14} /> Remove price drop alert</>
                      : <><Bell size={14} /> Alert me if price drops</>}
                  </button>
                )}
              </>
            )}

            {/* Contact strip */}
            <div className="flex items-center justify-between p-4 bg-earth-50 rounded-xl border border-earth-100">
              <p className="text-sm text-earth-600 font-body">Questions about this product?</p>
              <a href={`tel:${shopInfo.phone}`}
                className="flex items-center gap-1.5 text-sm text-brand-600 font-body
                  font-semibold hover:text-brand-700 transition-colors">
                <Phone size={14} /> Call Us
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRICE HISTORY CHART ─────────────────────────────────── */}
      {priceHistory.length < 2 ? (
        <div className="border-t border-earth-100 bg-white py-8 mt-4">
          <div className="container-page">
            <div className="flex items-center gap-2.5 mb-5">
              <Clock size={16} className="text-earth-500" />
              <h2 className="font-display text-lg font-bold text-earth-900">Price History</h2>
            </div>
            <div className="h-[200px] rounded-2xl border border-earth-100 bg-earth-50
              flex flex-col items-center justify-center gap-2">
              <TrendingDown size={28} className="text-earth-300" />
              <p className="text-earth-400 text-sm font-body">No price history yet</p>
              <p className="text-earth-300 text-xs font-body">
                Chart appears here once prices have been updated
              </p>
            </div>
          </div>
        </div>
      ) : (
        <Suspense fallback={
          <div className="border-t border-earth-100 bg-white py-8 mt-4">
            <div className="container-page">
              <div className="h-[200px] rounded-2xl bg-earth-50 animate-pulse" />
            </div>
          </div>
        }>
          <PriceHistoryChart
            priceHistory={priceHistory}
            priceRange={priceRange}
            onRangeChange={setPriceRange}
            bestTime={bestTime}
            productId={id}
          />
        </Suspense>
      )}

      {/* ── SUGGESTED PRODUCTS ────────────────────────────────────── */}

      {suggested.length > 0 && (
        <div className="border-t border-earth-100 bg-white py-10 mt-4">
          <div className="container-page">

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-body font-semibold text-earth-600 uppercase
                  tracking-widest mb-0.5">More from</p>
                <h2 className="font-display text-xl font-bold text-earth-900">
                  {product.category}
                </h2>
              </div>
              <Link to={`/shop?category=${encodeURIComponent(product.category)}`}
                className="flex items-center gap-1 text-sm font-body font-semibold text-brand-600
                  hover:text-brand-700 transition-colors">
                See all <ChevronRight size={15} />
              </Link>
            </div>

            {/* Horizontal scroll strip */}
            <div ref={scrollRef}
              className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide
                -mx-4 px-4 sm:mx-0 sm:px-0">
              {suggested.map(p => (
                <SuggestedCard key={p._id} product={p} />
              ))}

              {/* See all card at the end */}
              <Link to={`/shop?category=${encodeURIComponent(product.category)}`}
                className="flex-shrink-0 w-36 sm:w-44 flex flex-col items-center justify-center
                  aspect-square rounded-2xl border-2 border-dashed border-earth-200
                  hover:border-brand-300 hover:bg-brand-50 transition-all group">
                <div className="w-10 h-10 bg-earth-100 group-hover:bg-brand-100 rounded-full
                  flex items-center justify-center mb-2 transition-colors">
                  <ChevronRight size={18} className="text-earth-400 group-hover:text-brand-600 transition-colors" />
                </div>
                <p className="text-xs font-body font-semibold text-earth-700
                  group-hover:text-brand-600 transition-colors text-center px-2">
                  View all {product.category}
                </p>
              </Link>
            </div>
          </div>
        </div>
      )}

      {showAddToList && variety && packaging && (
        <AddToListModal
          items={[{
            productId: product._id,
            productName: product.name,
            variety: variety.varietyName,
            packaging: packaging.size,
            quantity,
          }]}
          onClose={() => setShowAddToList(false)}
        />
      )}
    </div>
  )
}
