import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

const CartContext = createContext(null)
const CART_KEY = 'vittorios_cart'

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_KEY)
      if (stored) setItems(JSON.parse(stored))
    } catch {
      localStorage.removeItem(CART_KEY)
    }
  }, [])

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
      if (quantity > i.stock) {
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

  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  const subtotal = items.reduce((sum, i) => sum + (i.priceKES * i.quantity), 0)
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{
      items, subtotal, itemCount, isOpen,
      addItem, removeItem, updateQuantity, clearCart,
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
