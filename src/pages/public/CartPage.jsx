import { Link } from 'react-router-dom'
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { formatKES } from '../../utils/helpers'

export default function CartPage() {
  const { items, subtotal: total, removeItem, updateQuantity } = useCart()

  if (items.length === 0) return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-earth-100 rounded-3xl flex items-center justify-center
          mx-auto mb-5">
          <ShoppingCart size={32} className="text-earth-300" />
        </div>
        <h2 className="font-display text-2xl font-bold text-earth-800 mb-2">Your cart is empty</h2>
        <p className="text-earth-500 font-body mb-6">
          Browse our products and add items to get started
        </p>
        <Link to="/shop" className="btn-primary">Browse Products</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="bg-earth-900 py-6 px-4">
        <div className="container-page max-w-4xl">
          <h1 className="font-display text-2xl font-bold text-cream">
            Your Cart
          </h1>
          <p className="text-earth-400 text-sm font-body mt-0.5">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="container-page max-w-4xl py-6 pb-12">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Items ────────────────────────────────────────────────── */}
          <div className="flex-1 space-y-3">
            {items.map(item => (
              <div key={item.key}
                className="bg-white rounded-2xl border border-earth-100 shadow-warm p-4 flex gap-4">

                {/* Image */}
                <div className="w-20 h-20 bg-earth-50 rounded-xl flex-shrink-0 overflow-hidden
                  border border-earth-100">
                  {item.imageURL ? (
                    <img src={item.imageURL} alt={item.productName}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🌾</div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <h3 className="font-body font-bold text-earth-900 text-sm truncate">
                        {item.productName}
                      </h3>
                      <p className="text-earth-500 text-xs font-body mt-0.5">
                        {item.variety} · {item.packaging}
                      </p>
                    </div>
                    <button onClick={() => removeItem(item.key)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-earth-300
                        hover:text-red-500 transition-colors flex-shrink-0">
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <p className="text-brand-600 text-xs font-body font-semibold mb-3">
                    {formatKES(item.unitPrice)} / bag
                  </p>

                  <div className="flex items-center justify-between">
                    {/* Qty controls */}
                    <div className="flex items-center gap-1 bg-earth-50 rounded-lg border
                      border-earth-200 p-0.5">
                      <button onClick={() => updateQuantity(item.key, item.quantity - 1)}
                        className="w-7 h-7 rounded-md bg-white border border-earth-200 flex
                          items-center justify-center hover:bg-earth-100 transition-colors shadow-sm">
                        <Minus size={12} className="text-earth-600" />
                      </button>
                      <span className="w-7 text-center text-sm font-body font-bold text-earth-900">
                        {item.quantity}
                      </span>
                      <button onClick={() => updateQuantity(item.key, item.quantity + 1)}
                        className="w-7 h-7 rounded-md bg-white border border-earth-200 flex
                          items-center justify-center hover:bg-earth-100 transition-colors shadow-sm">
                        <Plus size={12} className="text-earth-600" />
                      </button>
                    </div>

                    {/* Line total */}
                    <span className="font-display font-bold text-earth-900">
                      {formatKES(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Summary ──────────────────────────────────────────────── */}
          <div className="lg:w-72">
            <div className="bg-white rounded-2xl border border-earth-100 shadow-warm p-5 sticky top-6">
              <h2 className="font-display font-bold text-earth-900 text-lg mb-4">
                Order Summary
              </h2>

              <div className="space-y-2 mb-4 pb-4 border-b border-earth-100">
                {items.map(item => (
                  <div key={item.key} className="flex justify-between text-sm">
                    <span className="text-earth-600 font-body truncate flex-1 pr-2">
                      {item.productName} ×{item.quantity}
                    </span>
                    <span className="text-earth-900 font-body font-semibold flex-shrink-0">
                      {formatKES(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mb-1">
                <span className="font-body text-earth-600">Subtotal</span>
                <span className="font-display font-bold text-earth-900 text-xl">
                  {formatKES(total)}
                </span>
              </div>
              <p className="text-xs text-earth-400 font-body mb-5">
                Delivery fee calculated at checkout
              </p>

              <Link to="/checkout"
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-earth-900
                  text-cream rounded-xl font-body font-semibold hover:bg-earth-800
                  transition-all active:scale-[0.98]">
                Checkout <ArrowRight size={16} />
              </Link>

              <Link to="/shop"
                className="flex items-center justify-center w-full py-3 text-sm font-body
                  text-earth-500 hover:text-earth-700 transition-colors mt-2">
                ← Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}