import { Link } from 'react-router-dom'
import { Home, ShoppingBag, MapPin } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="font-display text-7xl font-bold text-brand-200 mb-2">404</p>
        <h1 className="font-display text-2xl font-bold text-earth-900 mb-2">Page not found</h1>
        <p className="text-earth-600 text-sm font-body leading-relaxed mb-8">
          The page you're looking for doesn't exist or has moved.
          Check the link, or head back to the shop.
        </p>
        <div className="space-y-3">
          <Link to="/" className="btn-primary w-full justify-center flex items-center gap-2">
            <Home size={16} /> Go Home
          </Link>
          <div className="flex gap-3">
            <Link to="/shop"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border
                border-earth-200 text-earth-700 rounded-xl text-sm font-body font-semibold
                hover:bg-earth-50 transition-colors">
              <ShoppingBag size={15} /> Shop
            </Link>
            <Link to="/track"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border
                border-earth-200 text-earth-700 rounded-xl text-sm font-body font-semibold
                hover:bg-earth-50 transition-colors">
              <MapPin size={15} /> Track Order
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
