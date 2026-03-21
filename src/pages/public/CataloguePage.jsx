import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X, SlidersHorizontal, LayoutGrid, Rows } from 'lucide-react'
import { productService } from '../../services/product.service'
import ProductCard from '../../components/products/ProductCard'
import ProductFilters from '../../components/products/ProductFilters'
import Spinner from '../../components/ui/Spinner'

// ── SKELETON ──────────────────────────────────────────────────────────────────
function SkeletonCard({ compact }) {
  return (
    <div className="bg-white rounded-2xl border border-earth-100 overflow-hidden animate-pulse">
      <div className={`bg-earth-100 ${compact ? 'aspect-square' : 'aspect-[4/3]'}`} />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-earth-100 rounded w-2/3" />
        <div className="h-3 bg-earth-100 rounded w-1/2" />
        <div className="h-9 bg-earth-100 rounded-xl mt-2" />
      </div>
    </div>
  )
}

// ── FILTER CHIP ───────────────────────────────────────────────────────────────
function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-brand-50 border border-brand-200
      text-brand-700 text-xs font-body font-semibold px-3 py-1.5 rounded-full">
      {label}
      <button onClick={onRemove}
        className="hover:text-brand-900 transition-colors ml-0.5">
        <X size={11} />
      </button>
    </span>
  )
}

// ── GRID TOGGLE ───────────────────────────────────────────────────────────────
function GridToggle({ compact, onChange }) {
  return (
    <div className="flex items-center gap-0.5 bg-earth-100 p-1 rounded-xl">
      <button onClick={() => onChange(false)} title="Comfortable view"
        className={`p-2 rounded-lg transition-all ${
          !compact ? 'bg-white text-earth-900 shadow-sm' : 'text-earth-400 hover:text-earth-600'
        }`}>
        <Rows size={15} />
      </button>
      <button onClick={() => onChange(true)} title="Compact grid"
        className={`p-2 rounded-lg transition-all ${
          compact ? 'bg-white text-earth-900 shadow-sm' : 'text-earth-400 hover:text-earth-600'
        }`}>
        <LayoutGrid size={15} />
      </button>
    </div>
  )
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function CataloguePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts]         = useState([])
  const [pagination, setPagination]     = useState(null)
  const [loading, setLoading]           = useState(true)
  const [searchInput, setSearchInput]   = useState(searchParams.get('search') || '')
  const [search, setSearch]             = useState(searchParams.get('search') || '')
  const [filtersOpen, setFiltersOpen]   = useState(false)
  const [compact, setCompact]           = useState(() => localStorage.getItem('gridCompact') === 'true')

  const filters = {
    category:      searchParams.get('category')     || '',
    inStock:       searchParams.get('inStock')       || '',
    packagingSize: searchParams.get('packagingSize') || '',
    minPrice:      searchParams.get('minPrice')      || '',
    maxPrice:      searchParams.get('maxPrice')      || '',
  }
  const page = Number(searchParams.get('page') || 1)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 12 }
      if (filters.category)      params.category      = filters.category
      if (filters.inStock)       params.inStock       = filters.inStock
      if (filters.packagingSize) params.packagingSize = filters.packagingSize
      if (filters.minPrice)      params.minPrice      = filters.minPrice
      if (filters.maxPrice)      params.maxPrice      = filters.maxPrice
      if (search)                params.search        = search
      const res = await productService.getAll(params)
      setProducts(res.data.data || [])
      setPagination(res.data.pagination)
    } catch { setProducts([]) }
    finally { setLoading(false) }
  }, [searchParams, search, page])

  useEffect(() => {
    const t = setTimeout(fetchProducts, 300)
    return () => clearTimeout(t)
  }, [fetchProducts])

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  // Lock body scroll when mobile filters open
  useEffect(() => {
    if (filtersOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [filtersOpen])

  const handleGridChange = (val) => {
    setCompact(val)
    localStorage.setItem('gridCompact', String(val))
  }

  const updateFilters = (newFilters) => {
    const params = {}
    Object.entries(newFilters).forEach(([k, v]) => { if (v) params[k] = v })
    if (search) params.search = search
    setSearchParams(params)
  }

  const removeFilter = (key) => updateFilters({ ...filters, [key]: '' })

  const clearAll = () => {
    setSearchInput('')
    setSearch('')
    setSearchParams({})
  }

  const activeChips = [
    filters.category      && { key: 'category',     label: filters.category },
    filters.packagingSize && { key: 'packagingSize', label: filters.packagingSize },
    filters.inStock       && { key: 'inStock',       label: 'In stock only' },
    (filters.minPrice || filters.maxPrice) && {
      key: 'price',
      label: `KES ${filters.minPrice || '0'} – ${filters.maxPrice || '∞'}`,
      onRemove: () => updateFilters({ ...filters, minPrice: '', maxPrice: '' })
    },
  ].filter(Boolean)

  const hasFilters = activeChips.length > 0 || search

  // Grid classes
  const gridClass = compact
    ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-3'
    : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="bg-earth-900 text-cream py-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="container-page relative">
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-1 text-center">
            Our Products
          </h1>
          <p className="text-earth-400 font-body text-sm text-center">
            {pagination
              ? `${pagination.total} product${pagination.total !== 1 ? 's' : ''} available`
              : 'Premium grains, cereals and flour products'}
          </p>
        </div>
      </div>

      <div className="container-page py-6">

        {/* ── Search + controls ──────────────────────────────────── */}
        <div className="flex gap-2 mb-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2
              text-earth-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search maize, beans, rice…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full bg-white border border-earth-200 rounded-xl pl-10 pr-10 py-3
                text-sm font-body text-earth-800 placeholder-earth-400 focus:outline-none
                focus:ring-2 focus:ring-brand-400 focus:border-transparent shadow-sm transition-all"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch('') }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-earth-400
                  hover:text-earth-700 hover:bg-earth-100 rounded-full transition-colors">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Grid toggle — always visible */}
          <GridToggle compact={compact} onChange={handleGridChange} />

          {/* Mobile filter button */}
          <button
            onClick={() => setFiltersOpen(true)}
            className={`md:hidden flex items-center gap-2 px-4 py-3 rounded-xl border
              text-sm font-body font-semibold transition-all shadow-sm ${
                hasFilters
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-earth-700 border-earth-200 hover:border-earth-300'
              }`}>
            <SlidersHorizontal size={15} />
            <span className="hidden xs:block">Filters</span>
            {activeChips.length > 0 && (
              <span className={`w-5 h-5 text-xs rounded-full flex items-center justify-center
                font-bold leading-none ${hasFilters ? 'bg-white/30 text-white' : 'bg-brand-100 text-brand-700'}`}>
                {activeChips.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Active chips ────────────────────────────────────────── */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {activeChips.map(chip => (
              <FilterChip key={chip.key} label={chip.label}
                onRemove={chip.onRemove || (() => removeFilter(chip.key))} />
            ))}
            <button onClick={clearAll}
              className="text-xs text-earth-400 hover:text-red-500 font-body font-medium
                underline transition-colors ml-1">
              Clear all
            </button>
          </div>
        )}

        <div className="flex gap-6">

          {/* ── Desktop sidebar ────────────────────────────────────── */}
          <aside className="w-60 flex-shrink-0 hidden md:block">
            <div className="sticky top-24 bg-white rounded-2xl border border-earth-100
              shadow-warm overflow-hidden">
              <ProductFilters filters={filters} onChange={updateFilters} />
            </div>
          </aside>

          {/* ── Mobile filter — LEFT SIDE DRAWER ──────────────────── */}
          {filtersOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                onClick={() => setFiltersOpen(false)}
              />
              {/* Drawer — slides in from LEFT */}
              <div className="fixed top-0 left-0 h-full w-[80vw] max-w-xs bg-white z-50
                md:hidden flex flex-col shadow-2xl"
                style={{ animation: 'slideInLeft 0.25s ease-out' }}>
                <ProductFilters
                  filters={filters}
                  onChange={(f) => { updateFilters(f) }}
                  onClose={() => setFiltersOpen(false)}
                />
              </div>
            </>
          )}

          {/* ── Product grid ───────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className={`grid gap-4 ${gridClass}`}>
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} compact={compact} />)}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-earth-100 rounded-2xl flex items-center
                  justify-center mx-auto mb-4">
                  <span className="text-3xl">🌾</span>
                </div>
                <h3 className="font-display text-xl text-earth-700 font-semibold mb-2">
                  No products found
                </h3>
                <p className="text-earth-400 text-sm font-body mb-6">
                  Try adjusting your search or filters
                </p>
                <button onClick={clearAll}
                  className="px-5 py-2.5 border border-earth-200 rounded-xl text-sm
                    font-body font-medium text-earth-600 hover:bg-earth-50 transition-colors">
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <div className={`grid gap-4 ${gridClass}`}>
                  {products.map(p => (
                    <ProductCard key={p._id} product={p} compact={compact} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination?.pages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-10">
                    <button
                      onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: page - 1 })}
                      disabled={page <= 1}
                      className="px-4 py-2.5 rounded-xl text-sm font-body border border-earth-200
                        bg-white text-earth-600 hover:bg-earth-50 disabled:opacity-40
                        disabled:cursor-not-allowed transition-colors">
                      ← Prev
                    </button>

                    <div className="flex gap-1">
                      {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === pagination.pages || Math.abs(p - page) <= 1)
                        .reduce((acc, p, i, arr) => {
                          if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
                          acc.push(p)
                          return acc
                        }, [])
                        .map((p, i) => p === '…' ? (
                          <span key={`e-${i}`}
                            className="w-9 h-9 flex items-center justify-center text-earth-400 text-sm">
                            …
                          </span>
                        ) : (
                          <button key={p}
                            onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: p })}
                            className={`w-9 h-9 rounded-xl text-sm font-body font-medium transition-all ${
                              p === page
                                ? 'bg-brand-500 text-white shadow-sm'
                                : 'bg-white text-earth-700 hover:bg-earth-100 border border-earth-200'
                            }`}>
                            {p}
                          </button>
                        ))
                      }
                    </div>

                    <button
                      onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: page + 1 })}
                      disabled={page >= pagination.pages}
                      className="px-4 py-2.5 rounded-xl text-sm font-body border border-earth-200
                        bg-white text-earth-600 hover:bg-earth-50 disabled:opacity-40
                        disabled:cursor-not-allowed transition-colors">
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}