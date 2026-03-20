import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Minus, ShoppingCart, Phone, Check, Tag, Package } from 'lucide-react'
import { productService } from '../../services/product.service'
import { useCart } from '../../context/CartContext'
import { formatKES } from '../../utils/helpers'
import Spinner from '../../components/ui/Spinner'
import { SHOP_INFO } from '../../utils/constants'

export default function ProductPage() {
  const { id } = useParams()
  const { addItem } = useCart()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedVariety, setSelectedVariety] = useState(0)
  const [selectedPkg, setSelectedPkg] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    productService.getById(id)
      .then(res => setProduct(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  if (!product) return (
    <div className="container-page py-16 text-center">
      <Package size={40} className="text-earth-300 mx-auto mb-4" />
      <p className="text-earth-500 font-body mb-4">Product not found.</p>
      <Link to="/shop" className="btn-primary">Back to Shop</Link>
    </div>
  )

  const variety = product.varieties?.[selectedVariety]
  const packaging = variety?.packaging?.[selectedPkg]
  const images = [...(variety?.imageURLs || []), ...(product.imageURLs || [])].filter(Boolean)
  const isQuoteOnly = packaging?.quoteOnly
  const inStock = packaging?.stock > 0 && !isQuoteOnly
  const maxQty = packaging?.stock || 0

  const stockStatus = !packaging ? null
    : packaging.stock === 0 ? 'out'
    : packaging.stock <= (packaging.lowStockThreshold || 10) ? 'low'
    : 'in'

  const stockConfig = {
    in:  { label: 'In Stock',      dot: 'bg-green-400', text: 'text-green-700', bg: 'bg-green-50 border-green-200' },
    low: { label: 'Low Stock',     dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    out: { label: 'Out of Stock',  dot: 'bg-red-400',   text: 'text-red-700',   bg: 'bg-red-50 border-red-200'     },
  }[stockStatus] || {}

  const handleAddToCart = () => {
    if (!variety || !packaging || isQuoteOnly || !inStock || added) return
    addItem(product, variety, packaging, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  const switchVariety = (i) => {
    setSelectedVariety(i)
    setSelectedPkg(0)
    setActiveImage(0)
    setQuantity(1)
  }

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Breadcrumb ────────────────────────────────────────────────── */}
      <div className="border-b border-earth-100 bg-white">
        <div className="container-page py-3">
          <Link to="/shop"
            className="inline-flex items-center gap-1.5 text-sm text-earth-500
              hover:text-brand-600 font-body transition-colors">
            <ArrowLeft size={15} /> Back to Shop
          </Link>
        </div>
      </div>

      <div className="container-page py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

          {/* ── Images ───────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="aspect-square bg-earth-50 rounded-2xl overflow-hidden relative group">
              {images.length > 0 ? (
                <img src={images[activeImage]} alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700
                    group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-8xl opacity-10">🌾</span>
                </div>
              )}
              {/* Category pill */}
              <div className="absolute top-4 left-4">
                <span className="bg-white/90 backdrop-blur-sm text-earth-600 text-xs
                  font-body font-medium px-3 py-1.5 rounded-full border border-white/50 shadow-sm">
                  {product.category}
                </span>
              </div>
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2
                      transition-all ${
                        i === activeImage
                          ? 'border-brand-500 shadow-sm scale-105'
                          : 'border-transparent hover:border-earth-300 opacity-70 hover:opacity-100'
                      }`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Details ──────────────────────────────────────────────── */}
          <div className="space-y-5">
            <div>
              <p className="text-earth-400 text-xs font-body uppercase tracking-widest mb-1.5">
                {product.category}
              </p>
              <h1 className="font-display text-3xl text-earth-900 font-bold leading-tight mb-2">
                {product.name}
              </h1>
              {product.description && (
                <p className="text-earth-500 font-body leading-relaxed">{product.description}</p>
              )}
            </div>

            {/* Variety selector */}
            {product.varieties?.length > 1 && (
              <div>
                <p className="text-xs font-body font-semibold text-earth-600 uppercase
                  tracking-wide mb-2">Variety</p>
                <div className="flex flex-wrap gap-2">
                  {product.varieties.map((v, i) => (
                    <button key={v.varietyName} onClick={() => switchVariety(i)}
                      className={`px-4 py-2 rounded-xl border text-sm font-body font-medium
                        transition-all ${
                          i === selectedVariety
                            ? 'bg-earth-900 text-white border-earth-900 shadow-sm'
                            : 'bg-white text-earth-700 border-earth-200 hover:border-earth-400'
                        }`}>
                      {v.varietyName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Packaging selector */}
            {variety?.packaging?.length > 0 && (
              <div>
                <p className="text-xs font-body font-semibold text-earth-600 uppercase
                  tracking-wide mb-2">Packaging Size</p>
                <div className="flex flex-wrap gap-2">
                  {variety.packaging.map((pkg, i) => (
                    <button key={pkg.size}
                      onClick={() => { setSelectedPkg(i); setQuantity(1) }}
                      className={`px-4 py-3 rounded-xl border text-sm font-body transition-all
                        text-left ${
                          i === selectedPkg
                            ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                            : 'bg-white text-earth-700 border-earth-200 hover:border-brand-300'
                        }`}>
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
              <div className="flex items-center gap-3 py-1">
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-brand-400" />
                  <span className="font-display text-2xl text-brand-600 font-bold">
                    {isQuoteOnly ? 'Quote only' : formatKES(packaging.priceKES)}
                  </span>
                </div>
                {stockStatus && (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-body
                    font-semibold px-2.5 py-1 rounded-full border ${stockConfig.bg} ${stockConfig.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${stockConfig.dot}`} />
                    {stockConfig.label}
                  </span>
                )}
              </div>
            )}

            {/* Quote only CTA */}
            {isQuoteOnly ? (
              <a href={`tel:${SHOP_INFO.phone}`}
                className="flex items-center justify-center gap-2 w-full py-4 bg-earth-900
                  text-cream rounded-xl font-body font-semibold hover:bg-earth-800 transition-all
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
                    <p className="text-xs text-earth-400 font-body">{packaging.stock} available</p>
                  )}
                </div>

                {/* Total */}
                {inStock && packaging?.priceKES && (
                  <p className="text-sm font-body text-earth-500">
                    Total: <span className="font-display font-bold text-earth-900 text-base">
                      {formatKES(packaging.priceKES * quantity)}
                    </span>
                  </p>
                )}

                {/* Add to cart */}
                <button onClick={handleAddToCart} disabled={!inStock || added}
                  className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl
                    font-body font-semibold text-base transition-all active:scale-[0.98] ${
                      added
                        ? 'bg-green-500 text-white'
                        : inStock
                        ? 'bg-earth-900 text-cream hover:bg-earth-800'
                        : 'bg-earth-100 text-earth-400 cursor-not-allowed'
                    }`}>
                  {added ? (
                    <><Check size={18} /> Added to Cart!</>
                  ) : (
                    <><ShoppingCart size={18} /> {inStock ? 'Add to Cart' : 'Out of Stock'}</>
                  )}
                </button>
              </>
            )}

            {/* Contact strip */}
            <div className="flex items-center justify-between p-4 bg-earth-50 rounded-xl border border-earth-100">
              <p className="text-sm text-earth-600 font-body">Questions about this product?</p>
              <a href={`tel:${SHOP_INFO.phone}`}
                className="flex items-center gap-1.5 text-sm text-brand-600 font-body
                  font-semibold hover:text-brand-700 transition-colors">
                <Phone size={14} /> Call Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}