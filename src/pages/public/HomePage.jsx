import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Package, Shield, Truck, Star } from 'lucide-react'
import { productService } from '../../services/product.service'
import ProductCard from '../../components/products/ProductCard'
import ProductSpotlight from '../../components/ui/ProductSpotlight'
import Spinner from '../../components/ui/Spinner'
import { SHOP_INFO } from '../../utils/constants'

export default function HomePage() {
  const [featured, setFeatured] = useState([])
  const [spotlight, setSpotlight] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      productService.getAll({ inStock: 'true' }, { limit: 6 }),
      productService.getAll({ inStock: 'true' }, { limit: 20 }),
      productService.getCategories()
    ]).then(([prodRes, spotRes, catRes]) => {
      setFeatured(prodRes.data.data || [])
      setCategories(catRes.data.data || [])
      // Shuffle and pick up to 6 for the spotlight rotation
      const all = spotRes.data.data || []
      const shuffled = [...all].sort(() => Math.random() - 0.5)
      setSpotlight(shuffled.slice(0, 6))
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-earth-900 text-cream overflow-hidden">
        {/* Decorative grain texture */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3Ccircle cx=\'33\' cy=\'33\' r=\'1\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
        />
        <div className="container-page py-16 sm:py-24 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-brand-500/20 text-brand-300 text-sm px-3 py-1.5 rounded-full mb-6 font-body">
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
              Fresh stock available now
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-cream leading-tight mb-6">
              Quality Grains,
              <span className="text-brand-400 block">Delivered Fresh</span>
            </h1>
            <p className="font-body text-earth-300 text-lg mb-8 leading-relaxed">
              Premium maize, beans, rice and more — sourced directly and delivered to you across Nairobi.
              Order online and pick up or get it delivered to your door.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/shop" className="btn-primary text-base px-8 py-4">
                Shop Now <ArrowRight size={18} />
              </Link>
              <Link to="/track" className="btn-outline border-earth-400 text-earth-200 hover:bg-earth-800 text-base px-8 py-4">
                Track Order
              </Link>
            </div>
          </div>
        </div>
        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-cream"
          style={{ clipPath: 'ellipse(55% 100% at 50% 100%)' }} />
      </section>

      {/* Trust badges */}
      <section className="py-10 bg-cream">
        <div className="container-page">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Package, title: 'Bulk Orders', desc: 'From 45kg bags' },
              { icon: Truck, title: 'Fast Delivery', desc: 'Nairobi wide' },
              { icon: Shield, title: 'Trusted Quality', desc: 'Verified sources' },
              { icon: Star, title: 'Best Prices', desc: 'Competitive rates' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-4 card">
                <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-brand-600" />
                </div>
                <div>
                  <p className="font-body font-semibold text-earth-900 text-sm">{title}</p>
                  <p className="text-earth-400 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="py-12 bg-earth-50">
          <div className="container-page">
            <h2 className="font-display text-2xl sm:text-3xl text-earth-900 font-semibold mb-6">
              Shop by Category
            </h2>
            <div className="flex flex-wrap gap-3">
              {categories.map(cat => (
                <Link
                  key={cat}
                  to={`/shop?category=${encodeURIComponent(cat)}`}
                  className="bg-white border border-earth-200 text-earth-700 hover:bg-brand-500 hover:text-white hover:border-brand-500 px-5 py-2.5 rounded-full font-body font-medium text-sm transition-all duration-200"
                >
                  {cat}
                </Link>
              ))}
              <Link
                to="/shop"
                className="text-brand-600 hover:text-brand-700 font-body font-medium text-sm px-3 py-2.5 flex items-center gap-1"
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Featured products */}
      <section className="py-12">
        <div className="container-page">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl sm:text-3xl text-earth-900 font-semibold">
              Available Now
            </h2>
            <Link to="/shop" className="text-brand-600 hover:text-brand-700 font-body font-medium text-sm flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : featured.length === 0 ? (
            <p className="text-earth-400 text-center py-12 font-body">No products available yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map(product => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-12 bg-brand-500">
        <div className="container-page text-center">
          <h2 className="font-display text-2xl sm:text-3xl text-white font-semibold mb-3">
            Need a bulk order or custom quote?
          </h2>
          <p className="text-brand-100 mb-6 font-body">
            Call us directly for bulk pricing, delivery schedules and special arrangements.
          </p>
          <a
            href={`tel:${SHOP_INFO.phone}`}
            className="inline-flex items-center gap-2 bg-white text-brand-700 font-body font-semibold px-8 py-3 rounded-lg hover:bg-brand-50 transition-colors"
          >
            {SHOP_INFO.phone}
          </a>
        </div>
      </section>

      {/* Floating product spotlight */}
      <ProductSpotlight products={spotlight} />
    </div>
  )
}