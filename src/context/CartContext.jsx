import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useBranch } from './BranchContext'
import { getCartUnitPrice } from '../utils/helpers'

const CartContext = createContext(null)
const CART_KEY = 'vittorios_cart'
const CART_BRANCH_KEY = 'vittorios_cart_branch'

// stock === null means "unknown" (reorder from an old order snapshot) — the
// quantity is then validated server-side at checkout instead of client-side.
// (Must be null, not Infinity: Infinity does not survive JSON persistence.)
const hasKnownStock = (item) => typeof item.stock === 'number' && Number.isFinite(item.stock)

export const CartProvider = ({ children }) => {
  // Hydrate synchronously from storage (reading localStorage is not async) —
  // doing this in an effect instead left a one-render window where `items`
  // was still `[]` while the separate persist-effect below could fire with
  // that stale value first and overwrite the real stored cart with "[]"
  // before the hydration landed (most visible under React 18 StrictMode's
  // dev-only double-effect-invocation).
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(CART_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      localStorage.removeItem(CART_KEY)
      return []
    }
  })
  const [isOpen, setIsOpen] = useState(false)
  const { branch, branchId } = useBranch()

  // Cart items belong to one branch's catalog (per-branch products/prices/stock).
  // If the resolved branch changes while the cart has items from another branch,
  // clear it — otherwise checkout would 404 on the other branch's product IDs.
  useEffect(() => {
    if (!branchId) return
    const cartBranch = localStorage.getItem(CART_BRANCH_KEY)
    if (cartBranch && cartBranch !== branchId && items.length > 0) {
      setItems([])
      localStorage.removeItem(CART_KEY)
      toast(`Cart cleared — now shopping from ${branch?.name || 'a different branch'}`, { icon: '🧺' })
    }
    localStorage.setItem(CART_BRANCH_KEY, branchId)
  }, [branchId, branch?.name, items.length])

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((product, variety, packaging, quantity = 1) => {
    const key = `${product._id}-${variety.varietyName}-${packaging.size}`
    setItems(prev => {
      const existing = prev.find(i => i.key === key)
      if (existing) {
        const newQty = existing.quantity + quantity
        if (newQty > packaging.stock) {
          toast.error(`Only ${packaging.stock} bags available`)
          return prev
        }
        toast.success('Cart updated')
        return prev.map(i => i.key === key ? { ...i, quantity: newQty } : i)
      }
      if (quantity > packaging.stock) {
        toast.error(`Only ${packaging.stock} bags available`)
        return prev
      }
      toast.success(`${product.name} added to cart`)
      return [...prev, {
        key,
        productId: product._id,
        productName: product.name,
        variety: variety.varietyName,
        packaging: packaging.size,
        priceKES: packaging.priceKES,
        // Volume tiers travel with the item so cart/checkout totals match the
        // tiered price the backend actually charges.
        pricingTiers: packaging.pricingTiers || [],
        stock: packaging.stock,
        imageURL: variety.imageURLs?.[0] || product.imageURLs?.[0] || null,
        quantity
      }]
    })
  }, [])

  const removeItem = useCallback((key) => {
    setItems(prev => prev.filter(i => i.key !== key))
  }, [])

  const updateQuantity = useCallback((key, quantity) => {
    if (quantity < 1) return
    setItems(prev => prev.map(i => {
      if (i.key !== key) return i
      if (hasKnownStock(i) && quantity > i.stock) {
        toast.error(`Only ${i.stock} bags available`)
        return i
      }
      return { ...i, quantity }
    }))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    localStorage.removeItem(CART_KEY)
  }, [])

  // Bulk-load items from a previous order (reorder flow).
  // Clears the cart first, then loads all items at their original quantities.
  // Stock is unknown at this point (user sees errors at checkout if OOS).
  const reorderItems = useCallback((orderItems) => {
    const cartItems = orderItems.map(item => ({
      key:         `${item.productId}-${item.variety}-${item.packaging}`,
      productId:   item.productId,
      productName: item.productName,
      variety:     item.variety,
      packaging:   item.packaging,
      priceKES:    item.unitPrice,
      pricingTiers: [],
      stock:       null, // stock not known from order snapshot; validated at checkout
      imageURL:    null,
      quantity:    item.quantity
    }))
    setItems(cartItems)
    toast.success('Items added to cart')
  }, [])

  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  // Tier-aware subtotal — matches the server-side price derivation
  const subtotal = items.reduce((sum, i) => sum + (getCartUnitPrice(i) * i.quantity), 0)
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{
      items, subtotal, itemCount, isOpen,
      addItem, removeItem, updateQuantity, clearCart, reorderItems,
      openCart, closeCart
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
