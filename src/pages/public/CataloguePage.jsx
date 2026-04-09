import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, X, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useOnboarding } from '../../context/OnboardingContext'
import { productService } from '../../services/product.service'
import ProductCard from '../../components/products/ProductCard'
import ProductFilters from '../../components/products/ProductFilters'
import Spinner from '../../components/ui/Spinner'
import SearchAutocomplete from '../../components/ui/SearchAutocomplete'
import SkeletonCard from '../../components/ui/SkeletonCard'
import GridToggle from '../../components/ui/GridToggle'
import { getOptimizedImageUrl } from '../../utils/image'

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

function StoryRail({ products, pagination, startTour }) {
  const railItems = products.slice(0, 10)

  return (
    <div className="bg-earth-900 text-cream border-b border-earth-800/70">
      <div className="container-page py-4 sm:py-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold">Our Products</h1>
            <p className="text-earth-400 font-body text-xs sm:text-sm mt-0.5">
              {pagination
                ? `${pagination.total} product${pagination.total !== 1 ? 's' : ''} available`
                : 'Browse the latest stock'}
            </p>
          </div>
          <button
            onClick={() => startTour('public', { force: true })}
            className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3.5 py-2
              text-[11px] font-body font-semibold uppercase tracking-[0.16em] text-brand-200 transition-colors hover:bg-brand-500/15"
          >
            <Sparkles size={12} />
            Tour
          </button>
        </div>

        {railItems.length > 0 && (
          <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
            <div className="flex gap-3 min-w-max">
              {railItems.map((product) => {
                const imageURL = product.varieties?.[0]?.imageURLs?.[0] || product.imageURLs?.[0]
                return (
                  <Link
                    key={product._id}
                    to={`/shop/${product._id}`}
                    className="group w-[92px] sm:w-[104px] flex-shrink-0"
                  >
                    <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full p-[2px] bg-gradient-to-br from-brand-400/80 via-brand-200/40 to-earth-300/20">
                      <div className="w-full h-full rounded-full overflow-hidden bg-earth-800 border border-white/10">
                        {imageURL ? (
                          <img
                            src={getOptimizedImageUrl(imageURL, { width: 192, height: 192 })}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl opacity-60">
                            🌾
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-center text-[11px] sm:text-xs font-body font-medium text-earth-200 mt-2 leading-tight line-clamp-2 group-hover:text-white transition-colors">
                      {product.name}
                    </p>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function CataloguePage() {
  const { startTour, activeTour, currentStep } = useOnboarding()
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
  }, [filters.category, filters.inStock, filters.maxPrice, filters.minPrice, filters.packagingSize, page, search])

  useEffect(() => {
    const t = setTimeout(fetchProducts, 300)
    return () => clearTimeout(t)
  }, [fetchProducts])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      document.documentElement?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' })
      document.body?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [page])

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  // Auto-open / auto-close filter drawer during the tour's search+filter step on mobile
  useEffect(() => {
    const onFilterStep = activeTour === 'public' && currentStep === 2
    if (onFilterStep && window.innerWidth < 768) {
      setFiltersOpen(true)
    } else if (!onFilterStep && activeTour) {
      // Tour is active but moved past this step — close the drawer
      setFiltersOpen(false)
    }
  }, [activeTour, currentStep])

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

  const changePage = (nextPage) => {
    setSearchParams({ ...Object.fromEntries(searchParams), page: nextPage })
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

      <div data-tour="public-shop-search">
        <StoryRail products={products} pagination={pagination} startTour={startTour} />

        <div className="container-page py-6">

          {/* ── Search + controls ──────────────────────────────────── */}
          <div className="flex gap-2 mb-4">
          {/* Search with autocomplete */}
          <SearchAutocomplete
            value={searchInput}
            onChange={setSearchInput}
            onSearch={(q) => {
              setSearchInput(q)
              setSearch(q)
              const params = {}
              Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
              if (q) params.search = q
              setSearchParams(params)
            }}
            placeholder="Search maize, beans, rice…"
            className="flex-1"
          />

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
                      onClick={() => changePage(page - 1)}
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
                            onClick={() => changePage(p)}
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
                      onClick={() => changePage(page + 1)}
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
      </div>{/* /data-tour */}

    </div>
  )
}
