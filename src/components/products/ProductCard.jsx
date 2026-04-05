import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Eye, Tag, Check } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { formatKES, getPriceRange, getStockStatus } from '../../utils/helpers'
import { getOptimizedImageUrl } from '../../utils/image'

// ── STOCK CONFIG ──────────────────────────────────────────────────────────────
const stockConfig = {
  in:  { dot: 'bg-green-400', text: 'text-green-600', label: 'In Stock',     badge: 'bg-green-50 text-green-700 border-green-200'   },
  low: { dot: 'bg-amber-400', text: 'text-amber-600', label: 'Low Stock',    badge: 'bg-amber-50 text-amber-700 border-amber-200'   },
  out: { dot: 'bg-red-400',   text: 'text-red-500',   label: 'Out of Stock', badge: 'bg-red-50 text-red-600 border-red-200'         },
}

// ── FULL CARD (default) ───────────────────────────────────────────────────────
function FullCard({ product, firstVariety, firstPkg, imageURL, inStock, stockStatus, onQuickAdd, adding, added }) {
  const cfg = stockConfig[stockStatus] || stockConfig.out

  return (
    <Link to={`/shop/${product._id}`}
      className="group bg-white rounded-2xl overflow-hidden border border-earth-100
        hover:border-earth-200 hover:shadow-warm-lg transition-all duration-300 flex flex-col">

      {/* Image */}
      <div className="relative aspect-[4/3] bg-earth-50 overflow-hidden">
        {imageURL ? (
          <img src={getOptimizedImageUrl(imageURL, { width: 640, height: 480 })}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105
              transition-transform duration-700 ease-out"
            loading="lazy"
            decoding="async" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl opacity-20">🌾</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent
          to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Category */}
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 backdrop-blur-sm text-earth-600 text-xs font-body
            font-medium px-2.5 py-1 rounded-full border border-white/50 shadow-sm">
            {product.category}
          </span>
        </div>

        {/* Stock badge (not in stock) */}
        {stockStatus !== 'in' && (
          <div className="absolute top-3 right-3">
            <span className={`flex items-center gap-1.5 bg-white/95 backdrop-blur-sm text-xs
              font-body font-medium px-2.5 py-1 rounded-full shadow-sm border ${cfg.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center
          opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 flex items-center
            gap-2 shadow-warm text-earth-700 text-xs font-body font-semibold
            translate-y-1 group-hover:translate-y-0 transition-transform duration-200">
            <Eye size={13} /> View Details
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-display font-semibold text-earth-900 text-lg leading-tight mb-2">
          {product.name}
        </h3>

        {/* Varieties */}
        {product.varieties?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.varieties.slice(0, 3).map(v => (
              <span key={v.varietyName}
                className="text-xs bg-earth-50 text-earth-500 border border-earth-100
                  px-2 py-0.5 rounded-full font-body">
                {v.varietyName}
              </span>
            ))}
            {product.varieties.length > 3 && (
              <span className="text-xs text-earth-400 px-1 font-body self-center">
                +{product.varieties.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-1.5 mt-auto mb-3">
          <Tag size={13} className="text-brand-400 flex-shrink-0" />
          <span className="font-display text-brand-600 font-semibold text-sm">
            {getPriceRange(product)}
          </span>
        </div>

        {/* In stock dot */}
        {stockStatus === 'in' && (
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-green-600 text-xs font-body">In Stock</span>
          </div>
        )}

        {/* Cart button */}
        {inStock && firstPkg ? (
          <button onClick={onQuickAdd} disabled={adding}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
              text-sm font-body font-semibold transition-all duration-200 ${
                added
                  ? 'bg-green-500 text-white'
                  : 'bg-earth-900 text-white hover:bg-earth-800 active:scale-[0.98]'
              }`}>
            {added
              ? <><Check size={15} /> Added!</>
              : <><ShoppingCart size={15} /> Add to Cart</>
            }
          </button>
        ) : (
          <div className="w-full py-2.5 rounded-xl text-sm font-body font-medium text-center
            bg-earth-50 text-earth-400 border border-earth-100">
            Out of Stock
          </div>
        )}
      </div>
    </Link>
  )
}

// ── COMPACT CARD (2-column grid) ──────────────────────────────────────────────
function CompactCard({ product, firstVariety, firstPkg, imageURL, inStock, stockStatus, onQuickAdd, adding, added }) {
  const cfg = stockConfig[stockStatus] || stockConfig.out

  return (
    <Link to={`/shop/${product._id}`}
      className="group bg-white rounded-2xl overflow-hidden border border-earth-100
        hover:border-earth-200 hover:shadow-warm-lg transition-all duration-300 flex flex-col">

      {/* Image — square */}
      <div className="relative aspect-square bg-earth-50 overflow-hidden">
        {imageURL ? (
          <img src={getOptimizedImageUrl(imageURL, { width: 420, height: 420 })}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105
              transition-transform duration-700 ease-out"
            loading="lazy"
            decoding="async" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl opacity-20">🌾</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent
          to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Stock badge */}
        {stockStatus !== 'in' && (
          <div className="absolute top-2 right-2">
            <span className={`flex items-center gap-1 bg-white/95 text-xs font-body
              font-semibold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
              <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
              {stockStatus === 'low' ? 'Low' : 'Out'}
            </span>
          </div>
        )}

        {/* Cart quick-add on hover */}
        {inStock && firstPkg && (
          <div className="absolute bottom-0 left-0 right-0 p-2
            translate-y-full group-hover:translate-y-0 transition-transform duration-200">
            <button onClick={onQuickAdd} disabled={adding}
              className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl
                text-xs font-body font-semibold transition-all ${
                  added
                    ? 'bg-green-500 text-white'
                    : 'bg-earth-900/90 backdrop-blur-sm text-white hover:bg-earth-900'
                }`}>
              {added
                ? <><Check size={12} /> Added!</>
                : <><ShoppingCart size={12} /> Add to Cart</>
              }
            </button>
          </div>
        )}
      </div>

      {/* Content — tighter */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-display font-semibold text-earth-900 text-sm leading-tight mb-1.5 line-clamp-2">
          {product.name}
        </h3>

        {/* First variety only */}
        {product.varieties?.length > 0 && (
          <p className="text-xs text-earth-400 font-body mb-2 truncate">
            {product.varieties[0].varietyName}
            {product.varieties.length > 1 && ` +${product.varieties.length - 1} more`}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto">
          <span className="font-display text-brand-600 font-bold text-sm">
            {getPriceRange(product)}
          </span>
          {stockStatus === 'in' && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
          )}
        </div>
      </div>
    </Link>
  )
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export default function ProductCard({ product, compact = false }) {
  const { addItem } = useCart()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const firstVariety = product.varieties?.[0]
  const firstPkg     = firstVariety?.packaging?.find(p => !p.quoteOnly && p.stock > 0)
  const imageURL     = firstVariety?.imageURLs?.[0] || product.imageURLs?.[0]
  const inStock      = product.varieties?.some(v => v.packaging?.some(p => p.stock > 0 && !p.quoteOnly))
  const stockStatus  = getStockStatus(firstPkg?.stock || 0, firstPkg?.lowStockThreshold || 10)

  const handleQuickAdd = (e) => {
    e.preventDefault()
    if (!firstVariety || !firstPkg || adding) return
    setAdding(true)
    addItem(product, firstVariety, firstPkg, 1)
    setAdded(true)
    setTimeout(() => { setAdding(false); setAdded(false) }, 1400)
  }

  const props = { product, firstVariety, firstPkg, imageURL, inStock, stockStatus, onQuickAdd: handleQuickAdd, adding, added }

  return compact ? <CompactCard {...props} /> : <FullCard {...props} />
}
