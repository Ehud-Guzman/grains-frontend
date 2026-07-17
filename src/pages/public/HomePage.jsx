import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Package, Sprout, Truck, Star, Sparkles, X, ChevronLeft, ChevronRight, Tag } from 'lucide-react'
import { productService } from '../../services/product.service'
import ProductCard from '../../components/products/ProductCard'
import ProductSpotlight from '../../components/ui/ProductSpotlight'
import CTABanner from '../../components/ui/CTABanner'
import SkeletonCard from '../../components/ui/SkeletonCard'
import GridToggle from '../../components/ui/GridToggle'
import { useAppSettings } from '../../context/AppSettingsContext'
import { useBranch } from '../../context/BranchContext'
import { getOptimizedImageUrl } from '../../utils/image'
import { promotionService } from '../../services/promotion.service'
import { formatKES } from '../../utils/helpers'

const FEATURED_LIMIT = 8
const SECONDARY_LIMIT = 6

function hasStock(product) {
  return product.varieties?.some(variety =>
    variety.packaging?.some(pkg => !pkg.quoteOnly && pkg.stock > 0)
  )
}

function hasSpotlightPrice(product) {
  return product.varieties?.some(variety =>
    variety.packaging?.some(pkg => !pkg.quoteOnly && pkg.priceKES)
  )
}

function hasSpotlightImage(product) {
  return Boolean(
    product.varieties?.some(variety => variety.imageURLs?.[0]) ||
    product.imageURLs?.[0]
  )
}

function getProductHeroImage(product) {
  for (const variety of product.varieties || []) {
    if (variety.imageURLs?.[0]) return variety.imageURLs[0]
  }
  return product.imageURLs?.[0] || null
}


// ── ANNOUNCEMENT BAR (tips) ───────────────────────────────────────────────────
function AnnouncementBar({ tips }) {
  const [idx, setIdx] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (tips.length <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % tips.length), 4000)
    return () => clearInterval(t)
  }, [tips.length])

  if (dismissed || tips.length === 0) return null
  const tip = tips[idx]

  return (
    <div className="bg-brand-700 text-white text-sm font-body py-2.5 px-4 relative overflow-hidden">
      <div className="container-page flex items-center justify-center gap-3">
        <Sparkles size={14} className="text-brand-300 flex-shrink-0" />
        <p className="text-center leading-snug">
          <span className="font-semibold">{tip.title}</span>
          {tip.description && <span className="text-white/75 ml-1.5">{tip.description}</span>}
        </p>
        {tips.length > 1 && (
          <div className="flex gap-1 ml-2">
            {tips.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
        )}
      </div>
      <button onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors">
        <X size={14} />
      </button>
    </div>
  )
}

// ── PROMO BANNER CAROUSEL (banner + seasonal) ─────────────────────────────────
function PromoBannerCarousel({ banners }) {
  const [idx, setIdx]       = useState(0)
  const [visible, setVisible] = useState(true)   // drives the fade
  const timerRef  = useRef(null)
  const pendingIdx = useRef(null)

  const go = useCallback((n) => {
    if (n === idx) return
    pendingIdx.current = n
    setVisible(false)                             // fade out
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      pendingIdx.current = null
      setIdx(i => {
        const next = (i + 1) % banners.length
        pendingIdx.current = null
        return next
      })
      setVisible(false)
    }, 6000)
  }, [idx, banners.length])

  // When visible goes false → swap slide → fade back in
  useEffect(() => {
    if (visible) return
    const t = setTimeout(() => {
      if (pendingIdx.current !== null) {
        setIdx(pendingIdx.current)
        pendingIdx.current = null
      } else {
        setIdx(i => (i + 1) % banners.length)
      }
      setVisible(true)
    }, 280)
    return () => clearTimeout(t)
  }, [visible, banners.length])

  // Auto-advance
  useEffect(() => {
    if (banners.length <= 1) return
    timerRef.current = setInterval(() => setVisible(false), 6000)
    return () => clearInterval(timerRef.current)
  }, [banners.length])

  if (banners.length === 0) return null
  const p = banners[idx]

  return (
    <section className="relative my-4 mx-3 sm:mx-6 lg:mx-10 rounded-2xl overflow-hidden shadow-xl">
      {/* Progress bar */}
      {banners.length > 1 && (
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
          {banners.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/20 overflow-hidden">
              <div className={`h-full bg-white/80 ${i === idx ? 'animate-[grow_6s_linear]' : i < idx ? 'w-full' : 'w-0'}`} />
            </div>
          ))}
        </div>
      )}

      {/* Slide */}
      <div className="relative h-52 sm:h-64 lg:h-72 w-full"
        style={{ transition: 'opacity 280ms ease', opacity: visible ? 1 : 0 }}>

        {/* Media: full-bleed cover video, or the blurred-backdrop + crisp cutout
            treatment for images (a video reads better full-bleed than as a
            small cutout, so it skips that treatment entirely) */}
        {p.mediaType === 'video' && p.videoUrl ? (
          <video key={p._id} src={p.videoUrl} poster={p.imageUrl || undefined}
            muted loop autoPlay playsInline
            className="absolute inset-0 w-full h-full object-cover" />
        ) : p.imageUrl ? (
          <>
            {/* Heavily blurred backdrop — a tiny transform is plenty */}
            <img src={getOptimizedImageUrl(p.imageUrl, { width: 480 })} alt="" aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-110"
              style={{ filter: 'blur(20px) brightness(0.4) saturate(1.3)' }} />
            {/* Crisp image — right side, natural ratio */}
            <div className="absolute inset-0 flex items-center justify-end pr-6 lg:pr-12 pointer-events-none">
              <img src={getOptimizedImageUrl(p.imageUrl, { width: 640 })} alt={p.title}
                className="h-[90%] w-auto max-w-[40%] object-contain drop-shadow-2xl" />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900" />
        )}

        {/* Left gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />

        {/* Text content */}
        <div className="relative h-full px-6 sm:px-8 flex flex-col justify-center max-w-sm sm:max-w-md">
          {p.seasonTag && (
            <span className="inline-flex items-center gap-1 self-start mb-2 text-[10px] font-body
              font-bold uppercase tracking-widest text-white/60">
              <Tag size={9} /> {p.seasonTag.replace(/_/g, ' ')}
            </span>
          )}
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-2">
            {p.title}
          </h2>
          {p.description && (
            <p className="font-body text-white/75 text-sm sm:text-base mb-4 leading-relaxed line-clamp-2">
              {p.description}
            </p>
          )}
          <Link
            to={p.linkedProductId ? `/shop/${p.linkedProductId}` : '/shop'}
            className="self-start inline-flex items-center gap-2 bg-white/95 text-earth-900
              font-body font-bold px-5 py-2.5 rounded-xl hover:bg-white transition-all
              active:scale-95 text-sm shadow-lg backdrop-blur-sm">
            {p.linkedProductId ? 'Shop Now' : 'Browse'} <ArrowRight size={14} />
          </Link>
        </div>

        {/* Subtle "Ad" label */}
        <span className="absolute bottom-2 right-3 text-[9px] font-body font-semibold
          text-white/30 uppercase tracking-widest select-none">Promoted</span>

        {/* Tap areas for prev/next on mobile */}
        {banners.length > 1 && (
          <>
            <button onClick={() => go((idx - 1 + banners.length) % banners.length)}
              className="absolute left-0 top-0 bottom-0 w-1/4 opacity-0" aria-label="Previous" />
            <button onClick={() => go((idx + 1) % banners.length)}
              className="absolute right-0 top-0 bottom-0 w-1/4 opacity-0" aria-label="Next" />
          </>
        )}
      </div>

      {/* Dot indicators — desktop */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {banners.map((_, i) => (
            <button key={i} onClick={() => go(i)}
              className={`rounded-full transition-all duration-300 ${
                i === idx ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/35 hover:bg-white/55'
              }`} />
          ))}
        </div>
      )}
    </section>
  )
}

// ── FEATURED PRODUCT PROMO ────────────────────────────────────────────────────
function FeaturedPromoCards({ promos, allProducts }) {
  const items = promos
    .map(p => ({ promo: p, product: allProducts.find(pr => pr._id === p.linkedProductId) }))
    .filter(x => x.product)
  if (items.length === 0) return null

  return (
    <section className="py-8 bg-white border-b border-earth-100">
      <div className="container-page">
        <div className="flex items-center gap-3 mb-4">
          <Star size={16} className="text-brand-500" />
          <h2 className="font-display text-lg font-bold text-earth-900">Staff Picks</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {items.map(({ promo, product }) => {
            const img = product.varieties?.find(v => v.imageURLs?.[0])?.imageURLs?.[0] || product.imageURLs?.[0]
            const pkg = product.varieties?.[0]?.packaging?.find(p => !p.quoteOnly && p.priceKES)
            return (
              <Link key={promo._id} to={`/shop/${product._id}`}
                className="flex-shrink-0 w-48 sm:w-56 bg-white rounded-2xl border border-earth-200
                  overflow-hidden shadow-warm hover:shadow-warm-lg hover:-translate-y-1 transition-all group">
                <div className="relative h-36 bg-earth-100">
                  {img
                    ? <img src={getOptimizedImageUrl(img, { width: 448, height: 288 })} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className="w-full h-full flex items-center justify-center"><Package size={28} className="text-earth-300" /></div>
                  }
                  <span className="absolute top-2 left-2 bg-brand-600 text-white text-[10px] font-body
                    font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    {promo.seasonTag ? promo.seasonTag.replace(/_/g, ' ') : 'Featured'}
                  </span>
                </div>
                <div className="p-3">
                  <p className="font-body font-semibold text-earth-900 text-sm truncate">{product.name}</p>
                  {promo.description && <p className="text-earth-500 text-xs mt-0.5 line-clamp-2">{promo.description}</p>}
                  {pkg && <p className="font-display font-bold text-brand-600 text-sm mt-1.5">KES {pkg.priceKES.toLocaleString()}</p>}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── FARM STORY — the journey every bag takes, farm → sack ───────────────────
// The founder farms too — this section is the storefront's provenance story.
// Photos are placeholders shared with the hero mosaic: swap in the client's
// real farm/store shots here; authenticity is the whole point.
const FARM_STORY_STEPS = [
  { src: '/maize%20farm.webp', num: '01', title: 'Grown',
    desc: 'It starts on our own farm — planted, tended and watched over by people who farm for a living.',
    position: 'center 30%', boost: true },
  { src: '/wheat-1188x792-1024x683.webp', num: '02', title: 'Harvested & Dried',
    desc: 'Harvested at full maturity, then sun-dried to safe moisture before it ever goes into storage.',
    position: 'center top' },
  { src: '/beans.webp', num: '03', title: 'Cleaned & Sorted',
    desc: 'Winnowed, cleaned and graded — only whole, clean grain makes it into a Vittorios bag.',
    position: 'center' },
  { src: '/mixedcereals.webp', num: '04', title: 'Packed & Delivered',
    desc: 'Weighed and packed at your branch, ready for pickup or delivery to your door.',
    position: 'center' },
]

function FarmStorySection() {
  return (
    <section
      id="farm-story"
      className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900
        py-14 sm:py-20 scroll-mt-32"
    >
      {/* Warm glows — echo the hero so the page bookends */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-500/15 rounded-full
        blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-700/20 rounded-full
        blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

      <div className="container-page relative">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <p className="inline-flex items-center gap-2 text-brand-300 text-xs font-body font-semibold
            uppercase tracking-[0.22em] mb-3">
            <Sprout size={14} /> Farm to Sack
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            From Our Farm to Your Store
          </h2>
          <p className="font-body text-brand-200/80 leading-relaxed">
            Vittorios isn&apos;t just a trader. It was founded by a farmer — so every bag we sell
            follows a journey we know first-hand.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {FARM_STORY_STEPS.map(({ src, num, title, desc, position, boost }) => (
            <div key={num} className="group">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 mb-4"
                style={{ aspectRatio: '4/3' }}>
                <img
                  src={src}
                  alt={title}
                  width={480}
                  height={360}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out
                    group-hover:scale-[1.05]"
                  style={{ objectPosition: position, ...(boost && { filter: 'saturate(1.35) contrast(1.1)' }) }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                <span className="absolute top-2.5 left-2.5 w-8 h-8 rounded-full bg-white/95 text-earth-900
                  font-display font-bold text-xs flex items-center justify-center shadow-lg">
                  {num}
                </span>
              </div>
              <h3 className="font-display font-bold text-white text-base sm:text-lg leading-tight mb-1.5">
                {title}
              </h3>
              <p className="font-body text-brand-200/70 text-xs sm:text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* The farmer's word */}
        <div className="mt-12 sm:mt-14 text-center">
          <p className="font-display text-xl sm:text-2xl text-white italic">
            &ldquo;Founded by a farmer. We sell what we grow.&rdquo;
          </p>
          <p className="font-body text-brand-300/80 text-xs uppercase tracking-[0.2em] mt-3">
            Vittorios Grains &amp; Cereals
          </p>
        </div>
      </div>
    </section>
  )
}

// ── PriceTicker ───────────────────────────────────────────────────────────────
// Shows all packaging sizes for one product at a time.
// Cube-flips with a left-to-right cascade when cycling to the next product.

const FLIP_MS     = 220
const HOLD_MS     = 3600
const COL_STAGGER = 55           // ms between each column's flip start
const MAX_PKGS    = 5            // max packaging columns shown
const TOTAL_FLIP  = FLIP_MS + (MAX_PKGS - 1) * COL_STAGGER // 440ms

function PriceTicker({ products, priceChanges }) {
  const [prodIdx, setProdIdx] = useState(0)
  const [anim, setAnim]       = useState(null) // null | 'out' | 'in'
  const idxRef = useRef(0)

  useEffect(() => {
    if (products.length <= 1) return
    let cancelled = false

    const advance = () => {
      if (cancelled) return
      setAnim('out')
      setTimeout(() => {
        if (cancelled) return
        const next = (idxRef.current + 1) % products.length
        idxRef.current = next
        setProdIdx(next)
        setAnim('in')
        setTimeout(() => {
          if (cancelled) return
          setAnim(null)
          setTimeout(advance, HOLD_MS)
        }, TOTAL_FLIP)
      }, TOTAL_FLIP)
    }

    const t = setTimeout(advance, HOLD_MS)
    return () => { cancelled = true; clearTimeout(t) }
  }, [products.length])

  const { product, packages } = products[prodIdx]
  const change  = priceChanges[product._id]
  const cols    = packages.slice(0, MAX_PKGS)
  const animCls = anim === 'out' ? 'cube-ticker-out' : anim === 'in' ? 'cube-ticker-in' : ''

  return (
    <div>
      {/* Header: product name + % change · "All prices" pinned right */}
      <div className="flex items-center justify-between gap-4 mb-2.5">
        <div style={{ perspective: '400px' }}>
          <div className={animCls} style={{ animationDelay: '0ms' }}>
            <div className="flex items-center gap-2">
              <p className="text-white/90 text-xs font-body font-semibold leading-none">
                {product.name}
              </p>
              {change && (
                <span className={`text-[10px] font-body font-bold ${change.direction === 'up' ? 'text-red-400' : 'text-green-400'}`}>
                  {change.direction === 'up' ? '▲' : '▼'}{change.pct}%
                </span>
              )}
            </div>
          </div>
        </div>
        <Link to="/shop"
          className="flex-shrink-0 text-[10px] font-body text-white/50 hover:text-white/90 transition-colors flex items-center gap-1">
          All prices <ArrowRight size={10} />
        </Link>
      </div>

      {/* Package columns + sparkline — each flips with a staggered delay */}
      <div className="flex items-end gap-x-6 flex-wrap gap-y-2">
        {cols.map((pkg, i) => (
          <div key={i} style={{ perspective: '400px' }}>
            <div className={animCls} style={{ animationDelay: `${i * COL_STAGGER}ms` }}>
              <Link to={`/shop/${product._id}`} className="group block">
                <p className="text-white/60 text-[10px] font-body leading-none">{pkg.size}</p>
                <span className="text-brand-300 font-display font-bold text-base leading-none group-hover:text-brand-200 transition-colors">
                  {formatKES(pkg.priceKES)}
                </span>
              </Link>
            </div>
          </div>
        ))}


      </div>

      {/* Dot indicators when there are multiple products */}
      {products.length > 1 && (
        <div className="flex items-center gap-1 mt-3">
          {products.map((_, i) => (
            <span key={i} className={`rounded-full transition-all duration-300 ${
              i === prodIdx ? 'w-3 h-1 bg-white/50' : 'w-1 h-1 bg-white/18'
            }`} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { shopInfo, orderSettings } = useAppSettings()
  const { branch } = useBranch()
  // "Nakuru Branch" → "Nakuru" — for copy that references the resolved branch
  const branchTown = branch?.name?.replace(/\s*branch\s*$/i, '').trim() || null
  const [featured, setFeatured]         = useState([])
  const [moreProducts, setMoreProducts] = useState([])
  const [spotlight, setSpotlight]       = useState([])
  const [promotions, setPromotions]     = useState([])
  const [loading, setLoading]           = useState(true)
  const [compact, setCompact]           = useState(true)
  const [priceChanges, setPriceChanges]   = useState({})

  // Persist grid preference (default true = 2-col mobile)
  useEffect(() => {
    const saved = localStorage.getItem('gridCompact')
    if (saved !== null) setCompact(saved === 'true')
  }, [])

  const handleGridChange = (val) => {
    setCompact(val)
    localStorage.setItem('gridCompact', String(val))
  }

  useEffect(() => {
    Promise.all([
      productService.getAll({ limit: 18 }),
      promotionService.getActive().catch(() => ({ data: { data: [] } })),
    ]).then(([prodRes, promoRes]) => {
      const all = prodRes.data.data || []
      const prioritized = [...all].sort((a, b) => Number(hasStock(b)) - Number(hasStock(a)))
      const spotlightCandidates = prioritized.filter(product =>
        hasSpotlightPrice(product) && hasSpotlightImage(product)
      )
      setFeatured(prioritized.slice(0, FEATURED_LIMIT))
      setMoreProducts(prioritized.slice(FEATURED_LIMIT, FEATURED_LIMIT + SECONDARY_LIMIT))
      setSpotlight([...spotlightCandidates].sort(() => Math.random() - 0.5).slice(0, 6))
      setPromotions(promoRes.data.data || [])

      // Price changes for card badges
      if (all.length) {
        productService.getPriceChanges(all.map(p => p._id))
          .then(res => setPriceChanges(res.data?.data || {}))
          .catch(() => {})
      }


    }).finally(() => setLoading(false))
  }, [])

  const tips    = promotions.filter(p => p.type === 'tip')
  const banners = promotions.filter(p => p.type === 'banner' || p.type === 'seasonal')
  const featuredPromos = promotions.filter(p => p.type === 'featured_product' && p.linkedProductId)

  return (
    <div>

      {/* ── Announcement bar ──────────────────────────────────────────── */}
      <AnnouncementBar tips={tips} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      {/* Single-family gradient — terracotta→gray mixes pass through a muddy
          desaturated brown, so dark sections stay inside the brand scale */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 to-brand-800">

        {/* Subtle dot texture */}
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3Ccircle cx=\'33\' cy=\'33\' r=\'1\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        {/* Warm glow — top-right */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/20 rounded-full
          blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        {/* Warm glow — top-left, softens the dark corner */}
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-brand-700/25 rounded-full
          blur-3xl -translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="container-page pt-2 pb-8 sm:pt-4 sm:pb-12 relative">
          <div className="grid lg:grid-cols-2 gap-8 xl:gap-12 items-start" data-tour="public-home-hero">

            {/* Left: text + CTAs */}
            <div>
              {/* Live price ticker — eyebrow above headline */}
              {!loading && (() => {
                const pulseProducts = featured
                  .filter(p => p.varieties?.some(v =>
                    v.packaging?.some(pkg => !pkg.quoteOnly && pkg.priceKES && pkg.stock > 0)
                  ))
                  .map(p => ({
                    product:  p,
                    packages: p.varieties.flatMap(v =>
                      (v.packaging || []).filter(pkg => !pkg.quoteOnly && pkg.priceKES && pkg.stock > 0)
                    ),
                  }))
                  .filter(x => x.packages.length > 0)

                if (!pulseProducts.length) return null

                return (
                  <div className="mb-12 pb-4 border-b border-white/10">
                    <p className="text-white/60 text-[10px] font-body uppercase tracking-[0.2em] mb-2">
                      Today's Prices
                    </p>
                    <PriceTicker products={pulseProducts} priceChanges={priceChanges} />
                  </div>
                )
              })()}

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white
                leading-tight mb-4">
                Quality Grains,
                <span className="text-brand-300 block">Delivered Fresh</span>
              </h1>
              <p className="font-body text-brand-200/90 text-base mb-6 leading-relaxed max-w-xl">
                Premium maize, beans, rice and more at wholesale &amp; retail prices.
                Order online{orderSettings.allowMpesa && ', pay with M-Pesa,'} and choose
                pickup or delivery from {branchTown ? `our ${branchTown} branch` : shopInfo.location}.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/shop"
                  data-tour="public-shop-cta"
                  className="inline-flex items-center justify-center gap-2 bg-white text-earth-900
                    font-body font-bold px-6 py-3 rounded-xl hover:bg-brand-100 transition-all
                    active:scale-[0.98] text-sm shadow-lg group">
                  Shop Now
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/track"
                  className="inline-flex items-center justify-center gap-2 border-2 border-white/25
                    text-white font-body font-bold px-6 py-3 rounded-xl hover:bg-white/10
                    transition-all text-sm">
                  Track Order
                </Link>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5">
                {['50+ products', 'Bulk from 45 kg', branchTown ? `${branchTown} & beyond` : 'Nairobi & beyond'].map(s => (
                  <span key={s} className="flex items-center gap-2 text-sm font-body text-brand-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: 2×2 editorial image mosaic */}
            <div className="hidden lg:block relative select-none">
              {/* Blend edges into the hero background */}
              <div className="absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-brand-900/30 to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-brand-900/70 to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-brand-900/50 to-transparent z-10 pointer-events-none" />

              {/* Journey teaser — tiles read as the farm-to-sack sequence and
                  scroll to the full story section below */}
              <p className="relative z-20 mb-2.5 text-[10px] font-body font-semibold uppercase tracking-[0.2em] text-white/50">
                From our farm to your sack
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  // boost: lifts the washed-out grey-sky field shot until a real farm photo replaces it
                  { src: '/maize%20farm.webp',              num: '01', label: 'Grown',          position: 'center 30%', boost: true },
                  { src: '/wheat-1188x792-1024x683.webp',   num: '02', label: 'Harvested',      position: 'center top' },
                  { src: '/beans.webp',                     num: '03', label: 'Sorted & Dried', position: 'center'     },
                  { src: '/mixedcereals.webp',              num: '04', label: 'Packed for You', position: 'center'     },
                ].map(({ src, num, label, position, boost }, i) => (
                  <a
                    key={i}
                    href="#farm-story"
                    className={`relative block overflow-hidden rounded-2xl border border-white/8 group ${i % 2 === 1 ? 'mt-6' : ''}`}
                    style={{ aspectRatio: '1/1' }}
                  >
                    <img
                      src={src}
                      alt={label}
                      width={480}
                      height={480}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      style={{ objectPosition: position, ...(boost && { filter: 'saturate(1.35) contrast(1.1)' }) }}
                      // lazy also stops phones downloading these: the mosaic is
                      // display:none below lg, but eager imgs fetch regardless
                      loading="lazy"
                      decoding="async"
                    />
                    {/* Depth gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    {/* Subtle warm tint overlay */}
                    <div className="absolute inset-0 bg-brand-900/15 mix-blend-multiply" />
                    {/* Step label */}
                    <div className="absolute bottom-3 left-3.5 flex items-baseline gap-2">
                      <span className="font-display font-bold text-brand-300 text-xs leading-none">{num}</span>
                      <span className="text-[10px] font-body font-bold uppercase tracking-[0.22em] text-white/70">
                        {label}
                      </span>
                    </div>
                    {/* Hover: brighten the top edge slightly */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                  </a>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── Trust badges ─────────────────────────────────────────────── */}
      <section className="py-10 bg-cream">
        <div className="container-page">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Package, title: 'Bulk Orders',    desc: 'From 45kg bags'      },
              { icon: Truck,   title: 'Fast Delivery',  desc: branchTown ? `Across ${branchTown}` : 'Nairobi wide' },
              { icon: Sprout,  title: 'Farmer-Owned',   desc: 'We grow what we sell' },
              { icon: Star,    title: 'Best Prices',    desc: 'Competitive rates'   },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-4 bg-white rounded-2xl
                border border-earth-100 hover:border-earth-200 hover:shadow-warm
                transition-all duration-200">
                <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center
                  justify-center flex-shrink-0 border border-brand-100">
                  <Icon size={18} className="text-brand-600" />
                </div>
                <div>
                  <p className="font-body font-bold text-earth-900 text-sm">{title}</p>
                  <p className="text-earth-500 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Promo carousel ───────────────────────────────────────────────── */}
      <PromoBannerCarousel banners={banners} />

      {/* ── Featured product promos ───────────────────────────────────────── */}
      <FeaturedPromoCards promos={featuredPromos} allProducts={[...featured, ...moreProducts]} />

      {/* ── Featured products ─────────────────────────────────────────── */}
      <section className="py-12 bg-cream">
        <div className="container-page">

          {/* Section header with grid toggle */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl text-earth-900 font-bold">
                Featured Products
              </h2>
              <p className="text-earth-500 text-sm font-body mt-1 max-w-2xl">
                Start with a wider look at our grains, beans, rice, feed, and pantry staples.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <GridToggle compact={compact} onChange={handleGridChange} />
              <Link to="/shop"
                className="hidden sm:flex text-brand-600 hover:text-brand-700 font-body
                  font-semibold text-sm items-center gap-1 transition-colors">
                View all <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className={`grid gap-4 ${
              compact
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            }`}>
              {Array.from({ length: FEATURED_LIMIT }).map((_, i) => (
                <SkeletonCard key={i} compact={compact} />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-earth-500 font-body">No products available yet.</p>
            </div>
          ) : (
            <div className={`grid gap-4 transition-all duration-300 ${
              compact
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            }`}>
              {featured.map(product => (
                <ProductCard key={product._id} product={product} compact={compact} priceChange={priceChanges[product._id]} />
              ))}
            </div>
          )}

          {/* Mobile view all */}
          <div className="mt-8 text-center sm:hidden">
            <Link to="/shop" className="btn-primary px-8 py-3">
              View All Products <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="py-12 bg-earth-50">
          <div className="container-page">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] items-start">
              <div className="bg-earth-900 rounded-[2rem] p-8 min-h-[260px] animate-pulse" />
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
                {Array.from({ length: SECONDARY_LIMIT }).map((_, i) => (
                  <SkeletonCard key={i} compact />
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : moreProducts.length > 0 && (
        <section className="py-12 bg-earth-50">
          <div className="container-page">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] items-start">
              <div className="bg-earth-50 border border-earth-200 rounded-[2rem] p-8 sm:p-10 overflow-hidden relative">
                <div className="relative">
                  <p className="text-brand-600 text-xs font-body font-semibold uppercase tracking-[0.22em] mb-4">
                    More to explore
                  </p>
                  <h3 className="font-display text-3xl sm:text-4xl font-bold text-earth-900 leading-tight mb-4">
                    A fuller look at what we stock every day.
                  </h3>
                  <p className="text-earth-600 font-body leading-relaxed max-w-md">
                    Browse more grains, cereals, legumes, and feed options straight from the homepage,
                    then open the full catalogue when you want every product in one place.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 mt-8">
                    <Link to="/shop" className="btn-primary px-6 py-3">
                      Browse Full Shop <ArrowRight size={16} />
                    </Link>
                    <Link
                      to="/shop?inStock=true"
                      className="inline-flex items-center justify-center rounded-xl border border-earth-300 bg-white px-6 py-3
                        text-sm font-body font-semibold text-earth-700 transition-all hover:bg-earth-100"
                    >
                      In-Stock Picks
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
                {moreProducts.map(product => (
                  <ProductCard key={product._id} product={product} compact priceChange={priceChanges[product._id]} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Farm story — provenance, the client's farmer identity ────── */}
      <FarmStorySection />

      <CTABanner />

      <ProductSpotlight products={spotlight} />
    </div>
  )
}
