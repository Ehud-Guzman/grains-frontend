import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { productService } from '../../services/product.service'
import ProductCard from '../../components/products/ProductCard'
import ProductFilters from '../../components/products/ProductFilters'
import Spinner from '../../components/ui/Spinner'
import { PACKAGING_SIZES } from '../../utils/constants'

// ── SKELETON CARD ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="aspect-square bg-earth-100" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-earth-100 rounded w-1/3" />
        <div className="h-5 bg-earth-100 rounded w-2/3" />
        <div className="flex gap-1">
          <div className="h-5 bg-earth-100 rounded-full w-16" />
          <div className="h-5 bg-earth-100 rounded-full w-20" />
        </div>
        <div className="h-5 bg-earth-100 rounded w-1/2 mt-2" />
        <div className="h-10 bg-earth-100 rounded-lg mt-1" />
      </div>
    </div>
  )
}

// ── ACTIVE FILTER CHIP ────────────────────────────────────────────────────────
function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-brand-50 border border-brand-200 text-brand-700
      text-xs font-body font-medium px-3 py-1.5 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-brand-900 transition-colors">
        <X size={12} />
      </button>
    </span>
  )
}

export default function CataloguePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const searchRef = useRef(null)

  const filters = {
    category:     searchParams.get('category')     || '',
    inStock:      searchParams.get('inStock')       || '',
    packagingSize:searchParams.get('packagingSize') || '',
    minPrice:     searchParams.get('minPrice')      || '',
    maxPrice:     searchParams.get('maxPrice')      || '',
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
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [searchParams, search, page])

  useEffect(() => {
    const t = setTimeout(fetchProducts, 300)
    return () => clearTimeout(t)
  }, [fetchProducts])

  // Debounce live search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

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

  // Active filter chips
  const activeChips = [
    filters.category      && { key: 'category',      label: filters.category },
    filters.packagingSize && { key: 'packagingSize',  label: filters.packagingSize },
    filters.inStock       && { key: 'inStock',        label: 'In stock only' },
    (filters.minPrice || filters.maxPrice) && {
      key: 'price',
      label: `KES ${filters.minPrice || '0'} – ${filters.maxPrice || '∞'}`,
      onRemove: () => updateFilters({ ...filters, minPrice: '', maxPrice: '' })
    },
  ].filter(Boolean)

  const hasFilters = activeChips.length > 0 || search

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Hero bar ───────────────────────────────────────────────────────── */}
      <div className="bg-earth-900 text-cream py-8">
        <div className="container-page">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold mb-1">
            Our Products
          </h1>
          <p className="text-earth-400 font-body text-sm">
            {pagination
              ? `${pagination.total} product${pagination.total !== 1 ? 's' : ''} available`
              : 'Premium grains, cereals and flour products'}
          </p>
        </div>
      </div>

      <div className="container-page py-6">

        {/* ── Search + filter bar ────────────────────────────────────────── */}
        <div className="flex gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search maize, beans, rice…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full bg-white border border-earth-200 rounded-xl pl-11 pr-10 py-3
                text-sm font-body text-earth-800 placeholder-earth-400
                focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
                shadow-sm transition-all"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch('') }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-earth-400
                  hover:text-earth-700 hover:bg-earth-100 rounded-full transition-colors">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setFiltersOpen(o => !o)}
            className={`md:hidden flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-body font-medium transition-all shadow-sm ${
              hasFilters
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white text-earth-700 border-earth-200'
            }`}
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeChips.length > 0 && (
              <span className="w-5 h-5 bg-white/30 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                {activeChips.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Active filter chips ────────────────────────────────────────── */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {activeChips.map(chip => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                onRemove={chip.onRemove || (() => removeFilter(chip.key))}
              />
            ))}
            <button onClick={clearAll}
              className="text-xs text-earth-500 hover:text-red-500 font-body underline transition-colors ml-1">
              Clear all
            </button>
          </div>
        )}

        <div className="flex gap-6">

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <aside className="w-56 flex-shrink-0 hidden md:block">
            <div className="sticky top-24">
              <ProductFilters filters={filters} onChange={updateFilters} />
            </div>
          </aside>

          {/* ── Mobile drawer ─────────────────────────────────────────────── */}
          {filtersOpen && (
            <>
              <div className="fixed inset-0 bg-black/40 z-40 md:hidden"
                onClick={() => setFiltersOpen(false)} />
              <div className="fixed bottom-0 left-0 right-0 bg-white z-50 md:hidden
                rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto shadow-warm-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold text-earth-900">Filters</h3>
                  <button onClick={() => setFiltersOpen(false)}
                    className="p-2 rounded-full hover:bg-earth-100 transition-colors">
                    <X size={18} className="text-earth-600" />
                  </button>
                </div>
                <ProductFilters filters={filters} onChange={(f) => { updateFilters(f); setFiltersOpen(false) }} />
              </div>
            </>
          )}

          {/* ── Product grid ──────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🌾</div>
                <h3 className="font-display text-xl text-earth-700 mb-2">No products found</h3>
                <p className="text-earth-400 text-sm font-body mb-6">
                  Try adjusting your search or filters
                </p>
                <button onClick={clearAll} className="btn-outline text-sm">
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {products.map(p => <ProductCard key={p._id} product={p} />)}
                </div>

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-10">
                    <button
                      onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: page - 1 })}
                      disabled={page <= 1}
                      className="px-4 py-2 rounded-lg text-sm font-body border border-earth-200 bg-white
                        text-earth-600 hover:bg-earth-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
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
                          <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-earth-400 text-sm">…</span>
                        ) : (
                          <button key={p}
                            onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: p })}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
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
                      className="px-4 py-2 rounded-lg text-sm font-body border border-earth-200 bg-white
                        text-earth-600 hover:bg-earth-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}