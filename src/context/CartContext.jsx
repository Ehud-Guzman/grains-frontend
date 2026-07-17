import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { useBranch } from './BranchContext'
import { getCartUnitPrice } from '../utils/helpers'
import { trackAddToCart } from '../utils/analytics'
import { productService } from '../services/product.service'

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
        trackAddToCart(product, variety, packaging, quantity)
        return prev.map(i => i.key === key ? { ...i, quantity: newQty } : i)
      }
      if (quantity > packaging.stock) {
        toast.error(`Only ${packaging.stock} bags available`)
        return prev
      }
      toast.success(`${product.name} added to cart`)
      trackAddToCart(product, variety, packaging, quantity)
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
        // Backend defaults a missing/undefined taxable to "taxable" — mirror that
        // here so checkout's VAT estimate matches order.service.js's vatBase calc.
        taxable: product.taxable !== false,
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

  // Bulk-load items from a previous order (reorder flow) or a saved list
  // (which resolves live product data before calling this). Clears the cart
  // first, then loads all items at their original quantities. `priceKES` wins
  // when provided (saved-list path with live prices); order-reorder items
  // only carry `unitPrice`, and stock is unknown from an order snapshot
  // (validated server-side at checkout instead).
  const reorderItems = useCallback((orderItems) => {
    const cartItems = orderItems.map(item => ({
      key:         item.key || `${item.productId}-${item.variety}-${item.packaging}`,
      productId:   item.productId,
      productName: item.productName,
      variety:     item.variety,
      packaging:   item.packaging,
      priceKES:    item.priceKES ?? item.unitPrice,
      pricingTiers: item.pricingTiers || [],
      taxable:     item.taxable !== false,
      stock:       item.stock ?? null,
      imageURL:    item.imageURL || null,
      quantity:    item.quantity
    }))
    setItems(cartItems)
    toast.success('Items added to cart')
  }, [])

  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  // ── LIVE PRICE/STOCK REFRESH ───────────────────────────────────────────────
  // The cart lives in localStorage and reorder items carry an old order's price
  // snapshot, but the backend always charges the CURRENT price (buildOrderItems
  // re-derives from the DB at order creation). Without this refresh a customer
  // could see one total in the cart and be charged another. Called by the cart
  // and checkout pages on mount: re-fetches each product, updates price/stock/
  // tiers in place, drops items that no longer exist, and tells the customer
  // what changed. Network failures leave the cart untouched (checkout still
  // validates server-side).
  const refreshing = useRef(false)
  const refreshPrices = useCallback(async () => {
    if (refreshing.current) return
    const current = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    if (current.length === 0) return
    refreshing.current = true
    try {
      const ids = [...new Set(current.map(i => i.productId))]
      const results = await Promise.allSettled(ids.map(id => productService.getById(id)))
      const liveMap = new Map()   // productId → product
      const goneSet = new Set()   // productId → 404 (deactivated/removed)
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') liveMap.set(ids[i], r.value.data.data)
        else if (r.reason?.response?.status === 404) goneSet.add(ids[i])
        // other rejections (network) → leave those items untouched
      })
      if (liveMap.size === 0 && goneSet.size === 0) return

      let priceChanged = false
      let removed = 0
      let stockClamped = false

      setItems(prev => prev.flatMap(item => {
        if (goneSet.has(item.productId)) { removed++; return [] }
        const product = liveMap.get(item.productId)
        if (!product) return [item]
        const variety = product.varieties?.find(v => v.varietyName === item.variety)
        const packaging = variety?.packaging?.find(p => p.size === item.packaging)
        if (!packaging || packaging.quoteOnly || !packaging.priceKES) { removed++; return [] }
        if (packaging.stock <= 0) { removed++; return [] }

        const next = { ...item }
        if (packaging.priceKES !== item.priceKES) { priceChanged = true; next.priceKES = packaging.priceKES }
        next.pricingTiers = packaging.pricingTiers || []
        next.taxable = product.taxable !== false
        next.stock = packaging.stock
        if (item.quantity > packaging.stock) { stockClamped = true; next.quantity = packaging.stock }
        return [next]
      }))

      if (removed > 0) toast(`${removed} item${removed !== 1 ? 's' : ''} no longer available — removed from your cart`, { icon: '🧺' })
      if (priceChanged) toast('Some prices changed since you added items — your cart now shows current prices', { icon: '💰' })
      if (stockClamped) toast('Quantities adjusted to available stock', { icon: '📦' })
    } catch {
      // best-effort — checkout re-validates server-side regardless
    } finally {
      refreshing.current = false
    }
  }, [])

  // Tier-aware subtotal — matches the server-side price derivation
  const subtotal = items.reduce((sum, i) => sum + (getCartUnitPrice(i) * i.quantity), 0)
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{
      items, subtotal, itemCount, isOpen,
      addItem, removeItem, updateQuantity, clearCart, reorderItems, refreshPrices,
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
