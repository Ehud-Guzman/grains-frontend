import { useState, useEffect } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { productService } from '../../services/product.service'
import { PACKAGING_SIZES } from '../../utils/constants'

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-earth-100 last:border-0 pb-4 last:pb-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full mb-3 group"
      >
        <span className="text-xs font-body font-semibold text-earth-700 uppercase tracking-wider">
          {title}
        </span>
        {open
          ? <ChevronUp size={14} className="text-earth-400 group-hover:text-earth-600 transition-colors" />
          : <ChevronDown size={14} className="text-earth-400 group-hover:text-earth-600 transition-colors" />
        }
      </button>
      {open && children}
    </div>
  )
}

export default function ProductFilters({ filters, onChange }) {
  const [categories, setCategories] = useState([])

  useEffect(() => {
    productService.getCategories()
      .then(res => setCategories(res.data.data || []))
  }, [])

  const hasActiveFilters = filters.category || filters.inStock ||
    filters.packagingSize || filters.minPrice || filters.maxPrice

  return (
    <div className="bg-white rounded-2xl border border-earth-100 shadow-sm p-4 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-earth-900 text-sm">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={() => onChange({})}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600
              font-body transition-colors"
          >
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {/* In stock toggle — top-level, always visible */}
      <label className="flex items-center justify-between cursor-pointer group">
        <span className="text-sm font-body text-earth-700 group-hover:text-earth-900 transition-colors">
          In stock only
        </span>
        <div
          onClick={() => onChange({ ...filters, inStock: filters.inStock === 'true' ? '' : 'true' })}
          className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
            filters.inStock === 'true' ? 'bg-brand-500' : 'bg-earth-200'
          }`}
        >
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
            filters.inStock === 'true' ? 'translate-x-4' : 'translate-x-0.5'
          }`} />
        </div>
      </label>

      {/* Category */}
      <FilterSection title="Category">
        <div className="space-y-1.5">
          {categories.map(cat => (
            <label key={cat} className="flex items-center gap-2.5 cursor-pointer group">
              <div
                onClick={() => onChange({ ...filters, category: filters.category === cat ? '' : cat })}
                className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0
                  border-2 transition-all cursor-pointer ${
                    filters.category === cat
                      ? 'bg-brand-500 border-brand-500'
                      : 'border-earth-300 group-hover:border-brand-400'
                  }`}
              >
                {filters.category === cat && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-sm font-body transition-colors ${
                filters.category === cat ? 'text-brand-700 font-medium' : 'text-earth-600 group-hover:text-earth-900'
              }`}>
                {cat}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Packaging size */}
      <FilterSection title="Bag Size">
        <div className="flex flex-wrap gap-2">
          {PACKAGING_SIZES.filter(s => s !== 'Bulk').map(size => (
            <button
              key={size}
              onClick={() => onChange({ ...filters, packagingSize: filters.packagingSize === size ? '' : size })}
              className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all ${
                filters.packagingSize === size
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-earth-50 text-earth-600 border border-earth-200 hover:border-brand-300 hover:text-brand-600'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Price range */}
      <FilterSection title="Price Range (KES)" defaultOpen={false}>
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice || ''}
                onChange={e => onChange({ ...filters, minPrice: e.target.value })}
                className="w-full border border-earth-200 rounded-lg px-3 py-2 text-sm font-body
                  text-earth-800 placeholder-earth-400 focus:outline-none focus:ring-2
                  focus:ring-brand-400 focus:border-transparent"
              />
            </div>
            <div className="flex items-center text-earth-300 text-xs">—</div>
            <div className="flex-1">
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice || ''}
                onChange={e => onChange({ ...filters, maxPrice: e.target.value })}
                className="w-full border border-earth-200 rounded-lg px-3 py-2 text-sm font-body
                  text-earth-800 placeholder-earth-400 focus:outline-none focus:ring-2
                  focus:ring-brand-400 focus:border-transparent"
              />
            </div>
          </div>
          {(filters.minPrice || filters.maxPrice) && (
            <button
              onClick={() => onChange({ ...filters, minPrice: '', maxPrice: '' })}
              className="text-xs text-earth-400 hover:text-red-500 font-body transition-colors"
            >
              Clear price range
            </button>
          )}
        </div>
      </FilterSection>
    </div>
  )
}