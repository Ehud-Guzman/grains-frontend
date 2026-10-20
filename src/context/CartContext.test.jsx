import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { CartProvider, useCart } from './CartContext'
import { useBranch } from './BranchContext'
import { productService } from '../services/product.service'
import toast from 'react-hot-toast'

vi.mock('./BranchContext', () => ({ useBranch: vi.fn() }))
vi.mock('react-hot-toast', () => {
  const toast = vi.fn()
  toast.success = vi.fn()
  toast.error = vi.fn()
  return { default: toast }
})
vi.mock('../services/product.service', () => ({
  productService: { getById: vi.fn(), getMany: vi.fn() },
}))
vi.mock('../utils/analytics', () => ({ trackAddToCart: vi.fn() }))

const CART_KEY = 'vittorios_cart'
const CART_BRANCH_KEY = 'vittorios_cart_branch'

const product = (overrides = {}) => ({
  _id: 'p1',
  name: 'Yellow Maize',
  varieties: [{ varietyName: 'Grade 1', packaging: [{ size: '50kg', priceKES: 100, stock: 100 }] }],
  ...overrides,
})

const variety = { varietyName: 'Grade 1' }
const packaging = (overrides = {}) => ({ size: '50kg', priceKES: 100, stock: 100, ...overrides })

/** Exposes the cart API to the test so actions can be driven directly. */
let api
function Consumer() {
  api = useCart()
  return (
    <div>
      <span data-testid="count">{api.itemCount}</span>
      <span data-testid="subtotal">{api.subtotal}</span>
      <span data-testid="items">{JSON.stringify(api.items)}</span>
    </div>
  )
}

// A fresh element per render: passing the *same* element object to rerender()
// makes React bail out of re-rendering, so a branch change would never be seen.
const cartUi = () => (
  <CartProvider>
    <Consumer />
  </CartProvider>
)

function renderCart() {
  return render(cartUi())
}

const readItems = () => JSON.parse(screen.getByTestId('items').textContent)
const readSubtotal = () => Number(screen.getByTestId('subtotal').textContent)

describe('CartContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useBranch.mockReturnValue({
      branch: { _id: 'branch-A', name: 'Nairobi' },
      branchId: 'branch-A',
    })
  })

  it('adds an item and reports count and subtotal', () => {
    renderCart()

    act(() => api.addItem(product(), variety, packaging(), 2))

    expect(readItems()).toHaveLength(1)
    expect(screen.getByTestId('count').textContent).toBe('2')
    expect(readSubtotal()).toBe(200)
  })

  it('merges quantity when the same product/variety/packaging is added twice', () => {
    renderCart()

    act(() => api.addItem(product(), variety, packaging(), 2))
    act(() => api.addItem(product(), variety, packaging(), 3))

    expect(readItems()).toHaveLength(1)
    expect(readItems()[0].quantity).toBe(5)
  })

  it('refuses to add beyond available stock', () => {
    renderCart()

    act(() => api.addItem(product(), variety, packaging({ stock: 3 }), 5))

    expect(readItems()).toHaveLength(0)
  })

  it('clamps a merge that would exceed stock', () => {
    renderCart()

    act(() => api.addItem(product(), variety, packaging({ stock: 3 }), 2))
    act(() => api.addItem(product(), variety, packaging({ stock: 3 }), 2))

    // Stays at the previously-accepted 2 rather than silently exceeding stock.
    expect(readItems()[0].quantity).toBe(2)
  })

  // Tier pricing must match the server's derivation, or the customer sees one
  // total in the cart and is charged another at checkout.
  it('applies the volume pricing tier for the chosen quantity', () => {
    const tiers = [
      { minQty: 10, priceKES: 90 },
      { minQty: 50, priceKES: 80 },
    ]
    renderCart()

    act(() => api.addItem(product(), variety, packaging({ pricingTiers: tiers }), 10))
    expect(readSubtotal()).toBe(900) // 10 × 90, not 10 × 100

    act(() => api.updateQuantity(readItems()[0].key, 50))
    expect(readSubtotal()).toBe(4000) // 50 × 80
  })

  it('recomputes the subtotal when quantity decreases back below a tier', () => {
    const tiers = [{ minQty: 10, priceKES: 90 }]
    renderCart()

    act(() => api.addItem(product(), variety, packaging({ pricingTiers: tiers }), 10))
    expect(readSubtotal()).toBe(900)

    act(() => api.updateQuantity(readItems()[0].key, 5))
    expect(readSubtotal()).toBe(500) // back to the base price
  })

  it('removes an item and clears the cart', () => {
    renderCart()

    act(() => api.addItem(product(), variety, packaging(), 1))
    const key = readItems()[0].key

    act(() => api.removeItem(key))
    expect(readItems()).toHaveLength(0)

    act(() => api.addItem(product(), variety, packaging(), 1))
    act(() => api.clearCart())
    expect(readItems()).toHaveLength(0)
    expect(localStorage.getItem(CART_KEY)).toBe('[]')
  })


describe('CartContext — branch isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useBranch.mockReturnValue({
      branch: { _id: 'branch-A', name: 'Nairobi' },
      branchId: 'branch-A',
    })
  })

  it('clears the cart when the resolved branch changes', () => {
    const { rerender } = renderCart()
    act(() => api.addItem(product(), variety, packaging(), 2))
    expect(readItems()).toHaveLength(1)

    useBranch.mockReturnValue({
      branch: { _id: 'branch-B', name: 'Nakuru' },
      branchId: 'branch-B',
    })
    rerender(cartUi())

    // Cart items are branch-scoped product IDs — keeping them would 404 at
    // checkout against the other branch's catalogue.
    expect(screen.getByTestId('count').textContent).toBe('0')
  })

  it('keeps the cart when the branch is unchanged', () => {
    const { rerender } = renderCart()
    act(() => api.addItem(product(), variety, packaging(), 2))

    rerender(cartUi())

    expect(screen.getByTestId('count').textContent).toBe('2')
  })

  it('does nothing while the branch is still unresolved', () => {
    localStorage.setItem(CART_KEY, JSON.stringify([
      { key: 'k', productId: 'p1', productName: 'x', variety: 'v', packaging: 's', quantity: 1, priceKES: 10 },
    ]))
    useBranch.mockReturnValue({ branch: null, branchId: null })

    renderCart()

    expect(screen.getByTestId('count').textContent).toBe('1')
  })
})

describe('CartContext — refreshPrices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useBranch.mockReturnValue({
      branch: { _id: 'branch-A', name: 'Nairobi' },
      branchId: 'branch-A',
    })
  })

  const liveProduct = (pkg) => ({
    data: {
      data: product({
        varieties: [{ varietyName: 'Grade 1', packaging: [{ size: '50kg', ...pkg }] }],
      }),
    },
  })

  it('updates a changed price so the cart matches what will be charged', async () => {
    renderCart()
    act(() => api.addItem(product(), variety, packaging(), 2))

    productService.getById.mockResolvedValue(liveProduct({ priceKES: 120, stock: 100 }))

    await act(async () => { await api.refreshPrices() })

    expect(readSubtotal()).toBe(240) // 2 × 120
  })

  it('drops items whose product no longer exists (404)', async () => {
    renderCart()
    act(() => api.addItem(product(), variety, packaging(), 2))

    productService.getById.mockRejectedValue({ response: { status: 404 } })

    await act(async () => { await api.refreshPrices() })

    expect(readItems()).toHaveLength(0)
  })

  it('drops items whose packaging went out of stock', async () => {
    renderCart()
    act(() => api.addItem(product(), variety, packaging(), 2))

    productService.getById.mockResolvedValue(liveProduct({ priceKES: 100, stock: 0 }))

    await act(async () => { await api.refreshPrices() })

    expect(readItems()).toHaveLength(0)
  })

  it('drops packaging that became quote-only', async () => {
    renderCart()
    act(() => api.addItem(product(), variety, packaging(), 2))

    productService.getById.mockResolvedValue(
      liveProduct({ priceKES: 100, stock: 50, quoteOnly: true }),
    )

    await act(async () => { await api.refreshPrices() })

    expect(readItems()).toHaveLength(0)
  })

  it('clamps the quantity down to the remaining stock', async () => {
    renderCart()
    act(() => api.addItem(product(), variety, packaging({ stock: 10 }), 8))

    productService.getById.mockResolvedValue(liveProduct({ priceKES: 100, stock: 3 }))

    await act(async () => { await api.refreshPrices() })

    expect(readItems()[0].quantity).toBe(3)
  })

  it('leaves the cart untouched when the network fails', async () => {
    renderCart()
    act(() => api.addItem(product(), variety, packaging(), 2))

    productService.getById.mockRejectedValue(new Error('offline'))

    await act(async () => { await api.refreshPrices() })

    // Checkout re-validates server-side, so a transient failure must not destroy
    // the customer's cart.
    expect(readItems()).toHaveLength(1)
    expect(readItems()[0].quantity).toBe(2)
  })

  it('does not fetch anything for an empty cart', async () => {
    renderCart()
    await act(async () => { await api.refreshPrices() })
    expect(productService.getById).not.toHaveBeenCalled()
  })

  it('is a no-op when called again while a refresh is already in flight', async () => {
    renderCart()
    act(() => api.addItem(product(), variety, packaging(), 2))
    productService.getById.mockResolvedValue(liveProduct({ priceKES: 100, stock: 100 }))

    await act(async () => {
      // The `refreshing` ref guard exists because the cart and checkout pages
      // both call this on mount.
      await Promise.all([api.refreshPrices(), api.refreshPrices()])
    })

    expect(productService.getById).toHaveBeenCalledTimes(1)
  })
})

describe('CartContext — reorder and drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useBranch.mockReturnValue({
      branch: { _id: 'branch-A', name: 'Nairobi' },
      branchId: 'branch-A',
    })
  })

  it('rebuilds a cart from a previous order snapshot', () => {
    renderCart()

    act(() => api.reorderItems([
      { productId: 'p2', productName: 'Beans', variety: 'Grade 1', packaging: '50kg', quantity: 3, priceKES: 60 },
    ]))

    expect(readItems()).toHaveLength(1)
    expect(readItems()[0].quantity).toBe(3)
    // Stock is unknown for an old snapshot → must be null, not Infinity (which
    // does not survive JSON persistence).
    expect(readItems()[0].stock).toBeNull()
  })

  it('merges a reorder into the existing cart instead of wiping it', () => {
    renderCart()
    act(() => api.addItem(product(), variety, packaging(), 2))

    act(() => api.reorderItems([
      { productId: 'p1', productName: 'Yellow Maize', variety: 'Grade 1', packaging: '50kg', quantity: 3, priceKES: 100 },
      { productId: 'p2', productName: 'Beans', variety: 'Grade 1', packaging: '50kg', quantity: 1, priceKES: 60 },
    ]))

    const items = readItems()
    expect(items).toHaveLength(2)
    expect(items.find(i => i.productId === 'p1').quantity).toBe(5)
  })

  it('ignores blank, fractional or zero typed quantities', () => {
    renderCart()
    act(() => api.addItem(product(), variety, packaging(), 4))
    const key = readItems()[0].key
    for (const bad of [NaN, 0, -2, 1.5, undefined]) act(() => api.updateQuantity(key, bad))
    expect(readItems()[0].quantity).toBe(4)
  })

  it('announces an add once, not once per state-updater run', () => {
    renderCart()
    act(() => api.addItem(product(), variety, packaging(), 1))
    expect(toast.success).toHaveBeenCalledTimes(1)
  })

  it('opens and closes the drawer', () => {
    renderCart()
    act(() => api.openCart())
    expect(api.isOpen).toBe(true)
    act(() => api.closeCart())
    expect(api.isOpen).toBe(false)
  })
})

  it('persists items to localStorage', () => {
    renderCart()
    act(() => api.addItem(product(), variety, packaging(), 1))

    const stored = JSON.parse(localStorage.getItem(CART_KEY))
    expect(stored).toHaveLength(1)
    expect(stored[0].productId).toBe('p1')
  })

  it('hydrates synchronously from localStorage on first render', () => {
    localStorage.setItem(CART_KEY, JSON.stringify([
      {
        key: 'p9-Grade 1-50kg',
        productId: 'p9',
        productName: 'Beans',
        variety: 'Grade 1',
        packaging: '50kg',
        quantity: 4,
        priceKES: 50,
      },
    ]))
    localStorage.setItem(CART_BRANCH_KEY, 'branch-A')

    renderCart()

    // Must be present on the very first render — doing this in an effect left a
    // window where the persist-effect overwrote the real cart with [].
    expect(screen.getByTestId('count').textContent).toBe('4')
    expect(readSubtotal()).toBe(200)
  })

  it('recovers from corrupted localStorage instead of crashing', () => {
    localStorage.setItem(CART_KEY, '{not json')

    renderCart()

    expect(readItems()).toHaveLength(0)
  })
})

describe('CartContext — unreliable browser storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    localStorage.clear()
    useBranch.mockReturnValue({
      branch: { _id: 'branch-A', name: 'Nairobi' },
      branchId: 'branch-A',
    })
  })

  it('still renders and works when every storage call throws (Safari "block all cookies", in-app browsers)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError') })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError') })

    expect(() => renderCart()).not.toThrow()
    expect(readItems()).toEqual([])

    // The cart works in memory even though nothing can be remembered.
    act(() => api.addItem(product(), variety, packaging(), 3))
    expect(screen.getByTestId('count').textContent).toBe('3')
    act(() => api.clearCart())
    expect(screen.getByTestId('count').textContent).toBe('0')
  })

  it('starts empty, and drops the entry, when the stored cart is not an array', () => {
    for (const damaged of ['null', '42', '{"a":1}', '"text"', '{broken json']) {
      localStorage.setItem(CART_KEY, damaged)
      const { unmount } = renderCart()
      expect(readItems()).toEqual([])
      unmount()
    }
  })

  it('ignores damaged lines inside an otherwise valid stored cart', () => {
    localStorage.setItem(CART_KEY, JSON.stringify([
      null,
      'junk',
      { productId: 'p1' },                                     // no quantity
      { productId: 'p1', quantity: 0, key: 'zero' },           // nothing to buy
      { productId: 'p1', key: 'p1-Grade 1-50kg', productName: 'Yellow Maize', variety: 'Grade 1', packaging: '50kg', priceKES: 100, quantity: 2, stock: 10 },
    ]))
    renderCart()
    expect(readItems()).toHaveLength(1)
    expect(screen.getByTestId('count').textContent).toBe('2')
  })

  it('refreshPrices works from the live cart even if storage is unreadable', async () => {
    renderCart()
    act(() => api.addItem(product(), variety, packaging({ priceKES: 100 }), 1))
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError') })
    productService.getById.mockResolvedValue({ data: { data: product({
      varieties: [{ varietyName: 'Grade 1', packaging: [{ size: '50kg', priceKES: 120, stock: 100 }] }],
    }) } })

    await act(async () => { await api.refreshPrices() })

    expect(readItems()[0].priceKES).toBe(120)
  })
})


describe('CartContext - refreshPrices via the batch endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useBranch.mockReturnValue({ branch: { _id: 'branch-A', name: 'Nairobi' }, branchId: 'branch-A' })
  })

  const live = (pkg) => product({
    varieties: [{ varietyName: 'Grade 1', packaging: [{ size: '50kg', ...pkg }] }],
  })

  it('asks for every product in ONE request and applies the new price', async () => {
    renderCart()
    act(() => api.addItem(product(), variety, packaging(), 2))
    productService.getMany.mockResolvedValue({ data: { data: [live({ priceKES: 130, stock: 100 })] } })

    await act(async () => { await api.refreshPrices() })

    expect(productService.getMany).toHaveBeenCalledTimes(1)
    expect(productService.getById).not.toHaveBeenCalled()
    expect(readSubtotal()).toBe(260)
  })

  it('a product missing from a successful batch answer is gone and leaves the cart', async () => {
    renderCart()
    act(() => api.addItem(product(), variety, packaging(), 2))
    productService.getMany.mockResolvedValue({ data: { data: [] } })

    await act(async () => { await api.refreshPrices() })

    expect(readItems()).toHaveLength(0)
  })

  it('if the batch call fails (older server / offline) it falls back to one request per product and never wipes the cart', async () => {
    renderCart()
    act(() => api.addItem(product(), variety, packaging(), 2))
    productService.getMany.mockRejectedValue(new Error('offline'))
    productService.getById.mockRejectedValue(new Error('offline'))

    await act(async () => { await api.refreshPrices() })

    expect(productService.getById).toHaveBeenCalledTimes(1)
    expect(readItems()).toHaveLength(1)
  })
})
