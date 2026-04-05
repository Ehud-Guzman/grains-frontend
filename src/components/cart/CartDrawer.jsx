import { Link } from 'react-router-dom'
import { X, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { formatKES } from '../../utils/helpers'
import { getOptimizedImageUrl } from '../../utils/image'

export default function CartDrawer() {
  const { items, subtotal, isOpen, closeCart, removeItem, updateQuantity } = useCart()

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={closeCart} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-cream z-50 flex flex-col shadow-warm-lg"
        style={{ animation: 'slideInRight 0.22s ease-out' }}>

        <div className="flex items-center justify-between p-5 border-b border-earth-100">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-brand-500" />
            <h2 className="font-display font-semibold text-earth-900">
              Your Cart {items.length > 0 && `(${items.length})`}
            </h2>
          </div>
          <button onClick={closeCart} className="p-2 rounded-lg hover:bg-earth-100 transition-colors">
            <X size={20} className="text-earth-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
              <ShoppingCart size={48} className="text-earth-200" />
              <div>
                <p className="font-display text-earth-700 text-lg">Your cart is empty</p>
                <p className="text-earth-400 text-sm mt-1">Browse our products and add items to get started</p>
              </div>
              <Link to="/shop" onClick={closeCart} className="btn-primary text-sm">Browse Products</Link>
            </div>
          ) : (
            items.map(item => (
              <div key={item.key} className="card p-3 flex gap-3">
                <div className="w-16 h-16 bg-earth-100 rounded-lg flex-shrink-0 overflow-hidden">
                  {item.imageURL ? (
                    <img src={getOptimizedImageUrl(item.imageURL, { width: 128, height: 128 })}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-earth-300 text-2xl">🌾</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body font-medium text-earth-900 text-sm truncate">{item.productName}</p>
                  <p className="text-earth-500 text-xs">{item.variety} · {item.packaging}</p>
                  <p className="text-brand-600 font-medium text-sm mt-1">{formatKES(item.priceKES * item.quantity)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => updateQuantity(item.key, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-earth-100 hover:bg-earth-200 flex items-center justify-center transition-colors">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-medium text-earth-900 w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.key, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-earth-100 hover:bg-earth-200 flex items-center justify-center transition-colors">
                      <Plus size={12} />
                    </button>
                    <button onClick={() => removeItem(item.key)}
                      className="ml-auto p-1.5 rounded-lg hover:bg-red-50 text-earth-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-earth-100 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-body text-earth-600">Subtotal</span>
              <span className="font-display font-semibold text-earth-900 text-lg">{formatKES(subtotal)}</span>
            </div>
            <p className="text-xs text-earth-400">Delivery fee calculated at checkout</p>
            <Link to="/checkout" onClick={closeCart} className="btn-primary w-full justify-center">
              Proceed to Checkout
            </Link>
            <button onClick={closeCart} className="btn-ghost w-full justify-center text-sm">
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  )
}
