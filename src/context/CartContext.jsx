import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import toast from 'react-hot-toast'
import { useBranch } from './BranchContext'
import { getCartUnitPrice } from '../utils/helpers'
import { trackAddToCart } from '../utils/analytics'
import { productService } from '../services/product.service'
import { safeStorage, readStoredArray } from '../utils/safeStorage'

const CartContext = createContext(null)
const CART_KEY = 'vittorios_cart'
const CART_BRANCH_KEY = 'vittorios_cart_branch'

// A stored cart line has to look like one before anything maps over it; a damaged or old-format
// entry is dropped rather than crashing the cart and every page that shows its badge.
const isCartLine = (line) => (
  line && typeof line === 'object' && typeof line.productId === 'string' && Number.isFinite(line.quantity) && line.quantity > 0
)

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
  // (safeStorage: storage can throw in Safari "block all cookies" and in-app browsers, and the old
  // catch block called localStorage again, so the error escaped the initializer and blanked the shop.)
  const [items, setItems] = useState(() => readStoredArray(CART_KEY, isCartLine))
  const [isOpen, setIsOpen] = useState(false)
  const { branch, branchId } = useBranch()

  // The cart's current contents, readable synchronously. Cart actions used to do their
  // work (and fire toasts and analytics) INSIDE a setItems(prev => …) updater. Updaters
  // must be pure — React may run one twice (StrictMode, concurrent rendering) — so
  // customers could get duplicate toasts and the funnel double-counted add-to-cart.
  // Actions now read this ref, decide, side-effect once, then commit.
  const itemsRef = useRef(items)
  const commit = useCallback((next) => {
    itemsRef.current = next
    setItems(next)
  }, [])

  // Cart items belong to one branch's catalog (per-branch products/prices/stock).
  // If the resolved branch changes while the cart has items from another branch,
  // clear it — otherwise checkout would 404 on the other branch's product IDs.
  useEffect(() => {
    if (!branchId) return
    const cartBranch = safeStorage.get(CART_BRANCH_KEY)
    if (cartBranch && cartBranch !== branchId && items.length > 0) {
      commit([])
      safeStorage.remove(CART_KEY)
      toast(`Cart cleared — now shopping from ${branch?.name || 'a different branch'}`, { icon: '🧺' })
    }
    safeStorage.set(CART_BRANCH_KEY, branchId)
  }, [branchId, branch?.name, items.length, commit])

  useEffect(() => {
    safeStorage.set(CART_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((product, variety, packaging, quantity = 1) => {
    const key = `${product._id}-${variety.varietyName}-${packaging.size}`
    const prev = itemsRef.current
    const existing = prev.find(i => i.key === key)
    // "available" not "bags": packs are sold as 1kg, 5kg … 100kg, not only bags.
    if (existing) {
      const newQty = existing.quantity + quantity
      if (newQty > packaging.stock) {
        toast.error(`Only ${packaging.stock} available`)
        return
      }
      toast.success('Cart updated')
      trackAddToCart(product, variety, packaging, quantity)
      commit(prev.map(i => i.key === key ? { ...i, quantity: newQty } : i))
      return
    }
    if (quantity > packaging.stock) {
      toast.error(`Only ${packaging.stock} available`)
      return
    }
    toast.success(`${product.name} added to cart`)
    trackAddToCart(product, variety, packaging, quantity)
    commit([...prev, {
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
      }])
  }, [commit])

  const removeItem = useCallback((key) => {
    commit(itemsRef.current.filter(i => i.key !== key))
  }, [commit])

  const updateQuantity = useCallback((key, quantity) => {
    // A typed value can be blank/NaN/fractional — only whole numbers from 1 up count.
    if (!Number.isInteger(quantity) || quantity < 1) return
    const target = itemsRef.current.find(i => i.key === key)
    if (!target) return
    if (hasKnownStock(target) && quantity > target.stock) {
      toast.error(`Only ${target.stock} available`)
      return
    }
    commit(itemsRef.current.map(i => i.key === key ? { ...i, quantity } : i))
  }, [commit])

  const clearCart = useCallback(() => {
    commit([])
    safeStorage.remove(CART_KEY)
  }, [commit])

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
    // Merge into what is already in the cart (summing quantities) instead of replacing
    // it — "Reorder" used to wipe a cart the customer had already filled, without asking.
    const merged = [...itemsRef.current]
    for (const incoming of cartItems) {
      const at = merged.findIndex(i => i.key === incoming.key)
      if (at === -1) { merged.push(incoming); continue }
      const current = merged[at]
      let quantity = current.quantity + incoming.quantity
      const stock = hasKnownStock(incoming) ? incoming.stock : (hasKnownStock(current) ? current.stock : null)
      if (stock !== null) quantity = Math.min(quantity, stock)
      merged[at] = { ...current, ...incoming, quantity }
    }
    commit(merged)
    toast.success('Items added to cart')
  }, [commit])

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
    // The live cart, not a fresh read of storage: storage is only written after render, can be
    // unavailable, and may hold something older than what the customer is looking at.
    const current = itemsRef.current
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

      // Computed from the live ref (not inside an updater) so the counters below, and the
      // toasts they drive, are only ever produced once.
      const nextItems = itemsRef.current.flatMap(item => {
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
      })
      commit(nextItems)

      if (removed > 0) toast(`${removed} item${removed !== 1 ? 's' : ''} no longer available — removed from your cart`, { icon: '🧺' })
      if (priceChanged) toast('Some prices changed since you added items — your cart now shows current prices', { icon: '💰' })
      if (stockClamped) toast('Quantities adjusted to available stock', { icon: '📦' })
    } catch {
      // best-effort — checkout re-validates server-side regardless
    } finally {
      refreshing.current = false
    }
  }, [commit])

  // Tier-aware subtotal — matches the server-side price derivation.
  // Memoised: every ProductCard in the catalogue calls useCart(), so an
  // unmemoised recalculation here re-ran this reduce over the whole cart on
  // every keystroke in the search box.
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + getCartUnitPrice(i) * i.quantity, 0),
    [items],
  )
  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  )

  // The context value MUST be memoised. It was previously a fresh object literal
  // on every render, which meant every consumer of useCart() re-rendered on any
  // unrelated provider render — adding one item re-rendered every card in the
  // catalogue grid, the Navbar and the drawer. All the functions below are
  // already stable (useCallback), so this object now only changes when cart
  // contents or drawer state actually change.
  const value = useMemo(() => ({
    items, subtotal, itemCount, isOpen,
    addItem, removeItem, updateQuantity, clearCart, reorderItems, refreshPrices,
    openCart, closeCart
  }), [
    items, subtotal, itemCount, isOpen,
    addItem, removeItem, updateQuantity, clearCart, reorderItems, refreshPrices,
    openCart, closeCart
  ])

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
