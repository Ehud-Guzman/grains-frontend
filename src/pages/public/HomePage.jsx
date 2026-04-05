import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Package, Shield, Truck, Star, Sparkles } from 'lucide-react'
import { useOnboarding } from '../../context/OnboardingContext'
import { productService } from '../../services/product.service'
import ProductCard from '../../components/products/ProductCard'
import ProductSpotlight from '../../components/ui/ProductSpotlight'
import CTABanner from '../../components/ui/CTABanner'
import SkeletonCard from '../../components/ui/SkeletonCard'
import GridToggle from '../../components/ui/GridToggle'
import { useShopInfo, useCategories } from '../../context/AppSettingsContext'
import { getOptimizedImageUrl } from '../../utils/image'

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


// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const shopInfo   = useShopInfo()
  const categories = useCategories()
  const { startTour } = useOnboarding()
  const [featured, setFeatured]         = useState([])
  const [moreProducts, setMoreProducts] = useState([])
  const [spotlight, setSpotlight]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [compact, setCompact]           = useState(false)

  // Persist grid preference
  useEffect(() => {
    const saved = localStorage.getItem('gridCompact')
    if (saved !== null) setCompact(saved === 'true')
  }, [])

  const handleGridChange = (val) => {
    setCompact(val)
    localStorage.setItem('gridCompact', String(val))
  }

  useEffect(() => {
    productService.getAll({ limit: 18 }).then(prodRes => {
      const all = prodRes.data.data || []
      const prioritized = [...all].sort((a, b) => Number(hasStock(b)) - Number(hasStock(a)))
      const spotlightCandidates = prioritized.filter(product =>
        hasSpotlightPrice(product) && hasSpotlightImage(product)
      )

      setFeatured(prioritized.slice(0, FEATURED_LIMIT))
      setMoreProducts(prioritized.slice(FEATURED_LIMIT, FEATURED_LIMIT + SECONDARY_LIMIT))
      setSpotlight([...spotlightCandidates].sort(() => Math.random() - 0.5).slice(0, 6))
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-earth-900 text-cream overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3Ccircle cx=\'33\' cy=\'33\' r=\'1\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        {/* Glow blob */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full
          blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className="container-page py-16 sm:py-24 relative">
          <div className="grid lg:grid-cols-2 gap-10 xl:gap-16 items-start" data-tour="public-home-hero">

            {/* Left: text + CTAs */}
            <div>
           
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-cream
                leading-tight mb-6">
                Quality Grains,
                <span className="text-brand-400 block">Delivered Fresh</span>
              </h1>
              <p className="font-body text-earth-300 text-lg mb-8 leading-relaxed max-w-xl">
                {shopInfo.tagline}. Premium maize, beans, rice and more are available for pickup
                or delivery from {shopInfo.location}.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/shop"
                  data-tour="public-shop-cta"
                  className="btn-primary text-base px-8 py-4 group">
                  Shop Now
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/track"
                  className="btn-outline border-earth-600 text-earth-200 hover:bg-earth-800
                    hover:border-earth-500 text-base px-8 py-4">
                  Track Order
                </Link>
                <button
                  onClick={() => startTour('public', { force: true })}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/8
                    px-6 py-4 text-base font-body font-semibold text-cream transition-all hover:bg-white/12"
                >
                  <Sparkles size={17} className="text-brand-300" />
                  Take Tour
                </button>
              </div>
            </div>

            {/* Right: 2×2 product image mosaic — muted so it doesn't compete with the spotlight popup */}
            <div className="hidden lg:block relative select-none">
              {/* Fade edges into the dark background */}
              <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-earth-900 to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-earth-900 to-transparent z-10 pointer-events-none" />

              <div className="grid grid-cols-2 gap-3">
                {loading
                  ? [0, 1, 2, 3].map(i => (
                      <div key={i}
                        className={`aspect-square rounded-2xl bg-earth-800 animate-pulse ${i % 2 === 1 ? 'mt-5' : ''}`}
                      />
                    ))
                  : (() => {
                      const heroImgs = featured
                        .map(p => ({ name: p.name, img: getProductHeroImage(p) }))
                        .filter(p => p.img)
                        .slice(0, 4)

                      // Pad to 4 slots so the grid stays full
                      const slots = [...heroImgs, ...Array(4 - heroImgs.length).fill(null)]

                      return slots.map((item, i) => (
                        <div key={i}
                          className={`relative aspect-square rounded-2xl overflow-hidden bg-earth-800 ${i % 2 === 1 ? 'mt-5' : ''}`}
                        >
                          {item && (
                            <>
                              <img
                                src={getOptimizedImageUrl(item.img, { width: 400, height: 400 })}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                loading="eager"
                                decoding="async"
                              />
                              {/* Dark veil keeps images subdued */}
                              <div className="absolute inset-0 bg-earth-900/50" />
                            </>
                          )}
                        </div>
                      ))
                    })()
                }
              </div>
            </div>

          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-cream"
          style={{ clipPath: 'ellipse(55% 100% at 50% 100%)' }} />
      </section>

      {/* ── Trust badges ─────────────────────────────────────────────── */}
      <section className="py-10 bg-cream">
        <div className="container-page">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Package, title: 'Bulk Orders',    desc: 'From 45kg bags'      },
              { icon: Truck,   title: 'Fast Delivery',  desc: 'Nairobi wide'        },
              { icon: Shield,  title: 'Trusted Quality',desc: 'Verified sources'    },
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
                  <p className="text-earth-400 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="py-12 bg-earth-50">
          <div className="container-page">
            <h2 className="font-display text-2xl sm:text-3xl text-earth-900 font-bold mb-6">
              Shop by Category
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {categories.map(cat => (
                <Link key={cat}
                  to={`/shop?category=${encodeURIComponent(cat)}`}
                  className="bg-white border border-earth-200 text-earth-700 hover:bg-brand-500
                    hover:text-white hover:border-brand-500 px-5 py-2.5 rounded-full font-body
                    font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-brand-900/20">
                  {cat}
                </Link>
              ))}
              <Link to="/shop"
                className="text-brand-600 hover:text-brand-700 font-body font-semibold text-sm
                  px-3 py-2.5 flex items-center gap-1 transition-colors">
                View all <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Featured products ─────────────────────────────────────────── */}
      <section className="py-12 bg-cream">
        <div className="container-page">

          {/* Section header with grid toggle */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl text-earth-900 font-bold">
                Featured Products
              </h2>
              <p className="text-earth-400 text-sm font-body mt-1 max-w-2xl">
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
              <p className="text-earth-400 font-body">No products available yet.</p>
            </div>
          ) : (
            <div className={`grid gap-4 transition-all duration-300 ${
              compact
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            }`}>
              {featured.map(product => (
                <ProductCard key={product._id} product={product} compact={compact} />
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
              <div className="bg-earth-900 text-cream rounded-[2rem] p-8 sm:p-10 overflow-hidden relative">
                <div className="absolute inset-0 opacity-10"
                  style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(255,255,255,0.35), transparent 42%)' }} />
                <div className="relative">
                  <p className="text-brand-300 text-xs font-body font-semibold uppercase tracking-[0.22em] mb-4">
                    More to explore
                  </p>
                  <h3 className="font-display text-3xl sm:text-4xl font-bold leading-tight mb-4">
                    A fuller look at what we stock every day.
                  </h3>
                  <p className="text-earth-300 font-body leading-relaxed max-w-md">
                    Browse more grains, cereals, legumes, and feed options straight from the homepage,
                    then open the full catalogue when you want every product in one place.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 mt-8">
                    <Link to="/shop" className="btn-primary px-6 py-3">
                      Browse Full Shop <ArrowRight size={16} />
                    </Link>
                    <Link
                      to="/shop?inStock=true"
                      className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/8 px-6 py-3
                        text-sm font-body font-semibold text-cream transition-all hover:bg-white/12"
                    >
                      In-Stock Picks
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
                {moreProducts.map(product => (
                  <ProductCard key={product._id} product={product} compact />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <CTABanner />

      <ProductSpotlight products={spotlight} />
    </div>
  )
}
