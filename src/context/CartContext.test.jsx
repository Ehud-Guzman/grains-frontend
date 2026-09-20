import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { CartProvider, useCart } from './CartContext'
import { useBranch } from './BranchContext'
import { productService } from '../services/product.service'

vi.mock('./BranchContext', () => ({ useBranch: vi.fn() }))
vi.mock('react-hot-toast', () => {
  const toast = vi.fn()
  toast.success = vi.fn()
  toast.error = vi.fn()
  return { default: toast }
})
vi.mock('../services/product.service', () => ({
  productService: { getById: vi.fn() },
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
