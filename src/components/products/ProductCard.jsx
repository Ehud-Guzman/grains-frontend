import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Eye, Tag } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { formatKES, getPriceRange, getStockStatus } from '../../utils/helpers'

export default function ProductCard({ product }) {
  const { addItem } = useCart()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const firstVariety = product.varieties?.[0]
  const firstPkg = firstVariety?.packaging?.find(p => !p.quoteOnly && p.stock > 0)
  const imageURL = firstVariety?.imageURLs?.[0] || product.imageURLs?.[0]
  const inStock = product.varieties?.some(v => v.packaging?.some(p => p.stock > 0 && !p.quoteOnly))
  const stockStatus = getStockStatus(firstPkg?.stock || 0, firstPkg?.lowStockThreshold || 10)

  const handleQuickAdd = async (e) => {
    e.preventDefault()
    if (!firstVariety || !firstPkg || adding) return
    setAdding(true)
    addItem(product, firstVariety, firstPkg, 1)
    setAdded(true)
    setTimeout(() => { setAdding(false); setAdded(false) }, 1400)
  }

  const stockConfig = {
    in:  { dot: 'bg-green-400',  text: 'text-green-600', label: 'In Stock' },
    low: { dot: 'bg-amber-400',  text: 'text-amber-600', label: 'Low Stock' },
    out: { dot: 'bg-red-400',    text: 'text-red-500',   label: 'Out of Stock' },
  }[stockStatus] || { dot: 'bg-red-400', text: 'text-red-500', label: 'Out of Stock' }

  return (
    <Link
      to={`/shop/${product._id}`}
      className="group bg-white rounded-2xl overflow-hidden border border-earth-100
        hover:border-earth-200 hover:shadow-warm-lg transition-all duration-300 flex flex-col"
    >
      {/* ── Image ──────────────────────────────────────────────────────── */}
      <div className="relative aspect-[4/3] bg-earth-50 overflow-hidden">
        {imageURL ? (
          <img
            src={imageURL}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl opacity-20">🌾</span>
          </div>
        )}

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent
          opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Category pill */}
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 backdrop-blur-sm text-earth-600 text-xs font-body font-medium
            px-2.5 py-1 rounded-full border border-white/50 shadow-sm">
            {product.category}
          </span>
        </div>

        {/* Stock indicator */}
        {stockStatus !== 'in' && (
          <div className="absolute top-3 right-3">
            <span className={`flex items-center gap-1.5 bg-white/95 backdrop-blur-sm text-xs font-body
              font-medium px-2.5 py-1 rounded-full shadow-sm ${stockConfig.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${stockConfig.dot}`} />
              {stockConfig.label}
            </span>
          </div>
        )}

        {/* Quick view overlay */}
        <div className="absolute inset-0 flex items-center justify-center
          opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2
            shadow-warm text-earth-700 text-xs font-body font-medium">
            <Eye size={13} /> View Details
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="p-4 flex flex-col flex-1">

        {/* Name */}
        <h3 className="font-display font-semibold text-earth-900 text-lg leading-tight mb-2">
          {product.name}
        </h3>

        {/* Variety pills */}
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

        {/* Stock status (when in stock, show subtly) */}
        {stockStatus === 'in' && (
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-green-600 text-xs font-body">In Stock</span>
          </div>
        )}

        {/* Add to cart button */}
        {inStock && firstPkg ? (
          <button
            onClick={handleQuickAdd}
            disabled={adding}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-body
              font-medium transition-all duration-200 ${
                added
                  ? 'bg-green-500 text-white'
                  : 'bg-earth-900 text-white hover:bg-earth-800 active:scale-[0.98]'
              }`}
          >
            {added ? (
              <>✓ Added to Cart</>
            ) : (
              <>
                <ShoppingCart size={15} />
                Add to Cart
              </>
            )}
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