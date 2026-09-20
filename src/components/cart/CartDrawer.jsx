import { Link } from 'react-router-dom'
import { X, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { formatKES, getCartUnitPrice } from '../../utils/helpers'
import { getOptimizedImageUrl } from '../../utils/image'
import MinimumOrderNotice from '../ui/MinimumOrderNotice'
import Modal from '../ui/Modal'

export default function CartDrawer() {
  const { items, subtotal, isOpen, closeCart, removeItem, updateQuantity } = useCart()

  if (!isOpen) return null

  const unitCount = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <Modal
      onClose={closeCart}
      placement="right"
      label={`Your cart, ${unitCount} item${unitCount === 1 ? '' : 's'}`}
      backdropClassName="bg-black/50 backdrop-blur-sm"
      panelClassName="bg-cream w-full max-w-sm shadow-warm-lg"
    >
      <div className="flex items-center justify-between p-5 border-b border-earth-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart size={20} className="text-brand-500" aria-hidden="true" />
          <h2 className="font-display font-semibold text-earth-900">
            Your Cart {items.length > 0 && `(${items.length})`}
          </h2>
        </div>
        <button type="button" onClick={closeCart} aria-label="Close cart"
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center
            rounded-lg hover:bg-earth-100 transition-colors">
          <X size={20} className="text-earth-600" aria-hidden="true" />
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
                  <p className="text-brand-600 font-medium text-sm mt-1">{formatKES(getCartUnitPrice(item) * item.quantity)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button type="button" onClick={() => updateQuantity(item.key, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      aria-label={`Decrease quantity of ${item.productName}`}
                      className="w-9 h-9 rounded-lg bg-earth-100 hover:bg-earth-200 flex items-center justify-center transition-colors disabled:opacity-40 disabled:hover:bg-earth-100 disabled:cursor-not-allowed">
                      <Minus size={12} aria-hidden="true" />
                    </button>
                    <span className="text-sm font-medium text-earth-900 w-6 text-center">{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.key, item.quantity + 1)}
                      aria-label={`Increase quantity of ${item.productName}`}
                      className="w-9 h-9 rounded-lg bg-earth-100 hover:bg-earth-200 flex items-center justify-center transition-colors">
                      <Plus size={12} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => removeItem(item.key)}
                      aria-label={`Remove ${item.productName} from cart`}
                      className="ml-auto p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-red-50 text-earth-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-earth-100 space-y-3 flex-shrink-0">
            <div className="flex justify-between items-center">
              <span className="font-body text-earth-600">Subtotal</span>
              <span className="font-display font-semibold text-earth-900 text-lg">{formatKES(subtotal)}</span>
            </div>
            <p className="text-xs text-earth-400">Delivery fee calculated at checkout</p>
            <MinimumOrderNotice subtotal={subtotal}
              quantity={items.reduce((s, i) => s + i.quantity, 0)} compact />
            <Link to="/checkout" onClick={closeCart} className="btn-primary w-full justify-center">
              Proceed to Checkout
            </Link>
            <button type="button" onClick={closeCart} className="btn-ghost w-full justify-center text-sm">
              Continue Shopping
            </button>
          </div>
        )}
    </Modal>
  )
}
