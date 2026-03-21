import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Package, Shield, Truck, Star, LayoutGrid, Rows } from 'lucide-react'
import { productService } from '../../services/product.service'
import ProductCard from '../../components/products/ProductCard'
import ProductSpotlight from '../../components/ui/ProductSpotlight'
import CTABanner from '../../components/ui/CTABanner'
import Spinner from '../../components/ui/Spinner'
import { SHOP_INFO } from '../../utils/constants'

// ── GRID TOGGLE ───────────────────────────────────────────────────────────────
function GridToggle({ compact, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-earth-100 p-1 rounded-xl">
      <button
        onClick={() => onChange(false)}
        title="List view"
        className={`p-2 rounded-lg transition-all ${
          !compact
            ? 'bg-white text-earth-900 shadow-sm'
            : 'text-earth-400 hover:text-earth-600'
        }`}>
        <Rows size={16} />
      </button>
      <button
        onClick={() => onChange(true)}
        title="Grid view"
        className={`p-2 rounded-lg transition-all ${
          compact
            ? 'bg-white text-earth-900 shadow-sm'
            : 'text-earth-400 hover:text-earth-600'
        }`}>
        <LayoutGrid size={16} />
      </button>
    </div>
  )
}

// ── SKELETON ──────────────────────────────────────────────────────────────────
function SkeletonCard({ compact }) {
  return (
    <div className={`bg-white rounded-2xl border border-earth-100 overflow-hidden animate-pulse`}>
      <div className={`bg-earth-100 ${compact ? 'aspect-square' : 'aspect-[4/3]'}`} />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-earth-100 rounded w-2/3" />
        <div className="h-3 bg-earth-100 rounded w-1/2" />
        <div className="h-9 bg-earth-100 rounded-xl mt-2" />
      </div>
    </div>
  )
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [featured, setFeatured]     = useState([])
  const [spotlight, setSpotlight]   = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [compact, setCompact]       = useState(false)

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
    Promise.all([
      productService.getAll({ inStock: 'true' }, { limit: 6 }),
      productService.getAll({ inStock: 'true' }, { limit: 20 }),
      productService.getCategories()
    ]).then(([prodRes, spotRes, catRes]) => {
      setFeatured(prodRes.data.data || [])
      setCategories(catRes.data.data || [])
      const all = spotRes.data.data || []
      setSpotlight([...all].sort(() => Math.random() - 0.5).slice(0, 6))
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
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-brand-500/20 text-brand-300
              text-sm px-3 py-1.5 rounded-full mb-6 font-body border border-brand-500/20">
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
              Fresh stock available now
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-cream
              leading-tight mb-6">
              Quality Grains,
              <span className="text-brand-400 block">Delivered Fresh</span>
            </h1>
            <p className="font-body text-earth-300 text-lg mb-8 leading-relaxed max-w-xl">
              Premium maize, beans, rice and more — sourced directly and delivered to you
              across Nairobi. Order online and pick up or get it delivered to your door.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/shop"
                className="btn-primary text-base px-8 py-4 group">
                Shop Now
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/track"
                className="btn-outline border-earth-600 text-earth-200 hover:bg-earth-800
                  hover:border-earth-500 text-base px-8 py-4">
                Track Order
              </Link>
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
                Available Now
              </h2>
              {!loading && featured.length > 0 && (
                <p className="text-earth-400 text-sm font-body mt-0.5">
                  {featured.length} products in stock
                </p>
              )}
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
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              {Array.from({ length: 6 }).map((_, i) => (
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
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
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

      <CTABanner />

      <ProductSpotlight products={spotlight} />
    </div>
  )
}