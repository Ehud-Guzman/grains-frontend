import { useState } from 'react'
import { X, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import { useCategories } from '../../context/AppSettingsContext'
import { PACKAGING_SIZES } from '../../utils/constants'

// ── COLLAPSIBLE SECTION ───────────────────────────────────────────────────────
function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-earth-100 last:border-0 pb-5 last:pb-0">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full mb-3 group py-1">
        <span className="text-xs font-body font-bold text-earth-700 uppercase tracking-widest">
          {title}
        </span>
        {open
          ? <ChevronUp size={14} className="text-earth-400 group-hover:text-earth-700 transition-colors" />
          : <ChevronDown size={14} className="text-earth-400 group-hover:text-earth-700 transition-colors" />
        }
      </button>
      {open && <div className="animate-in fade-in duration-150">{children}</div>}
    </div>
  )
}

// ── CUSTOM CHECKBOX ───────────────────────────────────────────────────────────
function Checkbox({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group py-0.5">
      <div onClick={onChange}
        className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0
          border-2 transition-all cursor-pointer ${
            checked
              ? 'bg-brand-500 border-brand-500 shadow-sm'
              : 'border-earth-300 group-hover:border-brand-400'
          }`}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`text-sm font-body transition-colors leading-tight ${
        checked ? 'text-brand-700 font-semibold' : 'text-earth-600 group-hover:text-earth-900'
      }`}>
        {label}
      </span>
    </label>
  )
}

// ── TOGGLE SWITCH ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group py-1">
      <span className={`text-sm font-body transition-colors ${
        checked ? 'text-earth-900 font-semibold' : 'text-earth-700 group-hover:text-earth-900'
      }`}>
        {label}
      </span>
      <div onClick={onChange}
        className={`relative w-10 h-5 rounded-full transition-all cursor-pointer ${
          checked ? 'bg-brand-500' : 'bg-earth-200'
        }`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm
          transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
    </label>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function ProductFilters({ filters, onChange, onClose }) {
  const categories = useCategories()

  const hasActive = filters.category || filters.inStock ||
    filters.packagingSize || filters.minPrice || filters.maxPrice

  const activeCount = [
    filters.category, filters.inStock, filters.packagingSize,
    (filters.minPrice || filters.maxPrice) ? 'price' : null
  ].filter(Boolean).length

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-earth-100
        flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand-50 border border-brand-100 rounded-lg
            flex items-center justify-center">
            <SlidersHorizontal size={13} className="text-brand-600" />
          </div>
          <span className="font-body font-bold text-earth-900">Filters</span>
          {activeCount > 0 && (
            <span className="w-5 h-5 bg-brand-500 text-white text-xs rounded-full
              flex items-center justify-center font-bold leading-none">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActive && (
            <button onClick={() => onChange({})}
              className="text-xs text-red-500 hover:text-red-700 font-body font-semibold
                transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
              Clear all
            </button>
          )}
          {onClose && (
            <button onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-earth-100 text-earth-500
                hover:text-earth-700 transition-colors md:hidden">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ── Filter body ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* In stock */}
        <Toggle
          label="In stock only"
          checked={filters.inStock === 'true'}
          onChange={() => onChange({ ...filters, inStock: filters.inStock === 'true' ? '' : 'true' })}
        />

        {/* Category */}
        <FilterSection title="Category">
          <div className="space-y-2">
            {categories.map(cat => (
              <Checkbox key={cat} label={cat}
                checked={filters.category === cat}
                onChange={() => onChange({ ...filters, category: filters.category === cat ? '' : cat })}
              />
            ))}
          </div>
        </FilterSection>

        {/* Bag size */}
        <FilterSection title="Bag Size">
          <div className="flex flex-wrap gap-2">
            {PACKAGING_SIZES.filter(s => s !== 'Bulk').map(size => (
              <button key={size}
                onClick={() => onChange({ ...filters, packagingSize: filters.packagingSize === size ? '' : size })}
                className={`px-3 py-1.5 rounded-xl text-xs font-body font-semibold
                  transition-all border ${
                    filters.packagingSize === size
                      ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                      : 'bg-earth-50 text-earth-600 border-earth-200 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50'
                  }`}>
                {size}
              </button>
            ))}
          </div>
        </FilterSection>

   {/* Price range */}
<FilterSection title="Price Range (KES)" defaultOpen={false}>
  <div className="space-y-4">

    {/* Min Price */}
    <div className="space-y-1">
      <label className="text-xs text-earth-500 font-medium">Minimum Price</label>
      <input
        type="number"
        placeholder="e.g. 500"
        value={filters.minPrice || ''}
        onChange={e => onChange({ ...filters, minPrice: e.target.value })}
        className="w-full border border-earth-200 rounded-2xl px-4 py-3 text-sm font-body
        text-earth-800 placeholder-earth-400 bg-earth-50
        focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
        transition-all"
      />
    </div>

    {/* Max Price */}
    <div className="space-y-1">
      <label className="text-xs text-earth-500 font-medium">Maximum Price</label>
      <input
        type="number"
        placeholder="e.g. 5000"
        value={filters.maxPrice || ''}
        onChange={e => onChange({ ...filters, maxPrice: e.target.value })}
        className="w-full border border-earth-200 rounded-2xl px-4 py-3 text-sm font-body
        text-earth-800 placeholder-earth-400 bg-earth-50
        focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
        transition-all"
      />
    </div>

    {/* Divider */}
    <div className="border-t border-earth-200" />

    {/* Clear button */}
    {(filters.minPrice || filters.maxPrice) && (
      <button
        onClick={() => onChange({ ...filters, minPrice: '', maxPrice: '' })}
        className="text-xs text-earth-400 hover:text-red-500 font-medium transition-colors"
      >
        Reset price filter
      </button>
    )}
  </div>
</FilterSection>
      </div>

      {/* ── Apply button (mobile only) ───────────────────────────── */}
      {onClose && (
        <div className="px-5 py-4 border-t border-earth-100 flex-shrink-0 md:hidden">
          <button onClick={onClose}
            className="w-full py-3.5 bg-earth-900 text-white rounded-xl text-sm font-body
              font-semibold hover:bg-earth-800 transition-colors active:scale-[0.98]">
            Show Results
          </button>
        </div>
      )}
    </div>
  )
}