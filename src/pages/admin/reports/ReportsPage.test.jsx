import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ReportsPage from './ReportsPage'
import { monthRange, eatToday } from './reportPeriods'

const m = vi.hoisted(() => ({
  user: { id: 'u', name: 'Test', role: 'admin' },
  svc: {
    getSales: vi.fn(), getBestSellers: vi.fn(), getStockValuation: vi.fn(), getStockTurnover: vi.fn(), getSlowMovers: vi.fn(),
    getStockMovement: vi.fn(), getCustomers: vi.fn(), getOrders: vi.fn(), getMargins: vi.fn(), getRiders: vi.fn(),
    getCashUp: vi.fn(), getOnboarding: vi.fn(), getVat: vi.fn(), exportCSV: vi.fn(),
  },
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}))

vi.mock('../../../services/admin/report.service', () => ({ adminReportService: m.svc }))
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: m.user }) }))
vi.mock('../../../context/AppSettingsContext', () => ({
  useShopInfo: () => ({ name: 'Vittorios', tagline: 'Grains', phone: '0700', email: 'a@b.c', hours: '8-5', location: 'Nairobi' }),
}))
vi.mock('../../../components/onboarding/OnboardingEnhancements', () => ({ OnboardingReturnLink: () => null }))
vi.mock('react-hot-toast', () => ({ default: m.toast }))
vi.mock('recharts', () => {
  const Pass = ({ children }) => <div>{children}</div>
  return { ResponsiveContainer: Pass, LineChart: Pass, Line: Pass, BarChart: Pass, Bar: Pass, XAxis: Pass, YAxis: Pass, CartesianGrid: Pass, Tooltip: Pass, Cell: Pass }
})

const PERIOD = { start: '2026-09-23T00:00:00.000Z', end: '2026-10-23T00:00:00.000Z' }
const SALES = {
  period: PERIOD,
  previous: { start: '2026-08-23T00:00:00.000Z', end: '2026-09-22T23:59:59.999Z', totalRevenue: 50000, totalOrders: 20, avgOrderValue: 2500, totalItems: 30 },
  summary: {
    totalRevenue: 88408499.4, totalOrders: 40, avgOrderValue: 2210212, totalItems: 90,
    paidRevenue: 60000000, paidOrders: 30, unpaidRevenue: 28408499.4, unpaidOrders: 10,
    breakdown: { goodsSubtotal: 80000000, couponDiscounts: 0, netGoods: 80000000, deliveryFees: 200000, vatCollected: 8208499.4 },
  },
  byCategory: [{ _id: 'Flour', revenue: 50000000, unitsSold: 400, orderCount: 20 }, { _id: 'Pulses', revenue: 30000000, unitsSold: 300, orderCount: 15 }],
  byDay: [{ date: '2026-10-01T00:00:00Z', revenue: 1000, orders: 2 }],
  byPaymentMethod: [{ _id: 'pickup', count: 5, revenue: 1000000 }, { _id: 'mpesa', count: 25, revenue: 60000000 }, { _id: 'delivery', count: 10, revenue: 27408499.4 }],
}
const stockRows = (n) => Array.from({ length: n }, (_, i) => ({
  productName: `Maize ${i + 1}`, category: 'Cereals', varietyName: 'Yellow', packagingSize: '50kg', stock: i + 1,
  unitValueKES: 1000, usedRetailFallback: false, totalValueKES: (i + 1) * 1000,
}))
const customer = (i) => ({ _id: `c${i}`, name: `Customer ${i}`, phone: `07000000${i}`, totalOrders: 3, totalSpend: 1000 * i, daysSinceLastOrder: 40, isInactive: true })

const ok = (data, extra = {}) => Promise.resolve({ data: { data, ...extra } })
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  m.user = { id: 'u', name: 'Test', role: 'admin' }
  // Reports this suite does not look at still get an (empty) answer, so landing on one never throws.
  for (const fn of Object.values(m.svc)) fn.mockImplementation(() => ok({}))
  m.svc.getSales.mockImplementation(() => ok(SALES))
  m.svc.getOrders.mockImplementation(() => ok({ period: PERIOD, byStatus: [{ _id: 'completed', count: 8, totalValue: 8000 }, { _id: 'cancelled', count: 2, totalValue: 2000 }], avgOrderValue: 1000,
    peakHours: [{ hour: 9, orders: 4 }], byHour: Array.from({ length: 24 }, (_, hour) => ({ hour, orders: hour === 9 ? 4 : 0 })) }))
  m.svc.getStockValuation.mockImplementation(() => ok({ rows: stockRows(60), totalStockValueKES: 1830000, itemCount: 60, rowsMissingCostPrice: 0 }))
  m.svc.getVat.mockImplementation(() => ok({ summary: { totalOrders: 3, totalExVat: 1000, totalVat: 160, totalInclVat: 1160, taxableSales: 800, exemptSales: 200, deliveryFees: 0 }, rows: [] }))
  m.svc.getCustomers.mockImplementation(({ segment = 'all', page = 1 } = {}) => ok({
    total: 120, repeat: 40, highValue: 12, inactive: 55, segment,
    customers: [customer(page * 10 + 1), customer(page * 10 + 2)],
    pagination: { page, limit: 2, total: segment === 'inactive' ? 55 : 120, pages: 3 },
  }))
  m.svc.getSlowMovers.mockImplementation(({ days }) => ok({
    days, count: 2, totalValueTiedUpKES: 33000,
    slowMovers: [
      { productId: 'p1', name: 'Never Sold Beans', category: 'Pulses', varietyCount: 1, stockUnits: 50, stockValueKES: 25000, usedRetailFallback: true, lastSoldAt: null, neverSold: true, daysWithoutSale: null },
      { productId: 'p2', name: 'Old Millet', category: 'Cereals', varietyCount: 2, stockUnits: 10, stockValueKES: 8000, usedRetailFallback: false, lastSoldAt: '2026-06-01T00:00:00Z', neverSold: false, daysWithoutSale: 144 },
    ],
  }))
  m.svc.exportCSV.mockResolvedValue({ data: 'a,b' })
  window.print = vi.fn()
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
})

const renderPage = () => render(<MemoryRouter><ReportsPage /></MemoryRouter>)
const pickGroup = (name) => userEvent.click(within(screen.getByRole('navigation', { name: 'Report sections' })).getByRole('button', { name, exact: true }))
const pickTab = (name) => userEvent.click(screen.getByRole('tab', { name }))
const pickPeriod = (name) => userEvent.click(within(screen.getByRole('group', { name: 'Period' })).getByRole('button', { name, exact: true }))
const bodyRows = () => screen.getAllByRole('row').length - 1

describe('Reports page: sales', () => {
  it('opens on 30-day sales with whole-shilling money, friendly payment names and a paid/unpaid split', async () => {
    renderPage()
    expect((await screen.findAllByText('KES 88,408,499')).length).toBeGreaterThan(0)   // not 88,408,499.4
    expect(m.svc.getSales).toHaveBeenCalledWith({ period: 'month' })
    expect(screen.getByText('M-Pesa')).toBeInTheDocument()
    expect(screen.getByText('Cash on delivery')).toBeInTheDocument()
    expect(screen.getByText('Pay on pickup')).toBeInTheDocument()
    expect(screen.queryByText('Mpesa')).not.toBeInTheDocument()
    expect(screen.getByText('Collected vs still to collect')).toBeInTheDocument()
    expect(screen.getByText(/Paid \(68%\)/)).toBeInTheDocument()                   // 60.0M of 88.4M
    expect(screen.getByText('KES 28,408,499')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /68% of revenue is paid/i })).toBeInTheDocument()
  })

  it('compares with the previous period and sorts payment methods by revenue', async () => {
    renderPage()
    await screen.findByText('Revenue by Category')
    expect(screen.getAllByText(/compared with the previous \d+ days/i).length).toBeGreaterThan(0)
    const rows = within(screen.getByText('Revenue by Payment Method').closest('section')).getAllByRole('row').slice(1)
    expect(rows.map(r => within(r).getAllByRole('cell')[0].textContent)).toEqual(['M-Pesa', 'Cash on delivery', 'Pay on pickup'])
  })

  it('labels units honestly: the categories added up, not the API\'s order-line count', async () => {
    renderPage()
    await screen.findByText('Revenue by Category')
    expect(screen.getByText('bags and packs, all products').closest('div')).toHaveTextContent('700')   // 400 + 300, not the 90 order lines
  })

  it('stays quiet about change when the API sends no previous period', async () => {
    m.svc.getSales.mockImplementation(() => ok({ ...SALES, previous: undefined }))
    renderPage()
    await screen.findByText('Revenue by Category')
    expect(screen.queryByText(/compared with/i)).not.toBeInTheDocument()
  })
})

describe('Reports page: navigation', () => {
  it('groups the reports by the question they answer, and follows a group to its first report', async () => {
    renderPage()
    await screen.findByText('Revenue by Category')
    for (const g of ['Sales', 'Orders & deliveries', 'Stock', 'Money & tax']) {
      expect(within(screen.getByRole('navigation', { name: 'Report sections' })).getByRole('button', { name: g, exact: true })).toBeInTheDocument()
    }
    expect(screen.getAllByRole('tab').map(t => t.textContent.trim())).toEqual(['Sales', 'Products', 'Customers'])
    await pickGroup('Stock')
    expect(await screen.findByText('Stock Valuation')).toBeInTheDocument()
    expect(m.svc.getStockValuation).toHaveBeenCalled()
    expect(screen.getAllByRole('tab').map(t => t.textContent.trim())).toEqual(['Stock value', 'Turnover', 'Slow movers', 'Stock movement'])
  })

  it('keeps the training-analytics report out of everyone\'s way except the superadmin', async () => {
    const { unmount } = renderPage()
    await screen.findByText('Revenue by Category')
    expect(within(screen.getByRole('navigation', { name: 'Report sections' })).queryByRole('button', { name: 'System' })).not.toBeInTheDocument()
    unmount()
    m.user = { id: 'u', name: 'Owner', role: 'superadmin' }
    renderPage()
    await screen.findByText('Revenue by Category')
    expect(within(screen.getByRole('navigation', { name: 'Report sections' })).getByRole('button', { name: 'System' })).toBeInTheDocument()
  })

  it('never shows an answer under the wrong heading when a slow request lands late', async () => {
    const slow = deferred()
    m.svc.getSales.mockImplementationOnce(() => slow.promise)
    renderPage()
    await pickGroup('Orders & deliveries')
    expect(await screen.findByText('Status Breakdown')).toBeInTheDocument()
    await act(async () => { slow.resolve({ data: { data: SALES } }) })              // the sales answer arrives after we left
    expect(screen.getByText('Status Breakdown')).toBeInTheDocument()
    expect(screen.queryByText('Revenue by Category')).not.toBeInTheDocument()
    expect(screen.queryByText('Collected vs still to collect')).not.toBeInTheDocument()
  })

  it('offers a retry when a report fails to load', async () => {
    m.svc.getSales.mockRejectedValueOnce(new Error('boom'))
    renderPage()
    expect(await screen.findByText(/couldn.t load this report/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Revenue by Category')).toBeInTheDocument()
    expect(m.svc.getSales).toHaveBeenCalledTimes(2)
  })
})

describe('Reports page: periods', () => {
  it('sends This month and Last month as explicit calendar dates', async () => {
    renderPage()
    await screen.findByText('Revenue by Category')
    await pickPeriod('This month')
    await waitFor(() => expect(m.svc.getSales).toHaveBeenLastCalledWith(monthRange(eatToday(), 0)))
    await pickPeriod('Last month')
    await waitFor(() => expect(m.svc.getSales).toHaveBeenLastCalledWith(monthRange(eatToday(), -1)))
  })

  it('asks for both dates before running a custom range, and refuses a backwards one', async () => {
    renderPage()
    await screen.findByText('Revenue by Category')
    const calls = () => m.svc.getSales.mock.calls.length
    await pickPeriod('Custom')
    expect(screen.getByText(/pick a start and an end date/i)).toBeInTheDocument()
    const before = calls()
    await userEvent.type(screen.getByLabelText('From'), '2026-10-10')
    expect(calls()).toBe(before)                                                   // half-filled: nothing asked
    await userEvent.type(screen.getByLabelText('To'), '2026-10-01')
    expect(screen.getByRole('alert')).toHaveTextContent(/start date is after the end date/i)
    expect(calls()).toBe(before)
    await userEvent.clear(screen.getByLabelText('To'))
    await userEvent.type(screen.getByLabelText('To'), '2026-10-20')
    await waitFor(() => expect(m.svc.getSales).toHaveBeenLastCalledWith({ from: '2026-10-10', to: '2026-10-20' }))
  })

  it('moves VAT off a rolling window (which would split months) and explains if you go back', async () => {
    renderPage()
    await screen.findByText('Revenue by Category')
    await pickGroup('Money & tax')
    await pickTab('VAT')
    await waitFor(() => expect(m.svc.getVat).toHaveBeenCalledWith(monthRange(eatToday(), -1)))
    expect(screen.getByRole('button', { name: 'Last month' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText(/rolling stretch of days/i)).not.toBeInTheDocument()
    await pickPeriod('30 Days')
    expect(await screen.findByText(/rolling stretch of days/i)).toBeInTheDocument()
  })

  it('hides the period choices on reports that are a snapshot, not a window', async () => {
    renderPage()
    await screen.findByText('Revenue by Category')
    await pickGroup('Stock')
    await screen.findByText('Stock Valuation')
    expect(screen.queryByRole('group', { name: 'Period' })).not.toBeInTheDocument()
  })
})

describe('Reports page: customers, slow movers, export, print', () => {
  it('narrows customers to a segment, pages within it, and starts again at page 1 when the segment changes', async () => {
    renderPage()
    await pickTab('Customers')
    await screen.findByText('Customer 11')
    expect(m.svc.getCustomers).toHaveBeenLastCalledWith({ segment: 'all', page: 1 })
    await userEvent.click(screen.getByRole('button', { name: /inactive \(30d\+\)/i }))
    expect(await screen.findByText('Customers who have stopped ordering')).toBeInTheDocument()
    expect(m.svc.getCustomers).toHaveBeenLastCalledWith({ segment: 'inactive', page: 1 })
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => expect(m.svc.getCustomers).toHaveBeenLastCalledWith({ segment: 'inactive', page: 2 }))
    await userEvent.click(screen.getByRole('button', { name: /repeat buyers/i }))
    await waitFor(() => expect(m.svc.getCustomers).toHaveBeenLastCalledWith({ segment: 'repeat', page: 1 }))
    expect(screen.getByRole('link', { name: 'Customer 11' })).toHaveAttribute('href', '/admin/customers/c11')
  })

  it('shows what each slow mover ties up, when it last sold, and re-asks for a longer window', async () => {
    renderPage()
    await pickGroup('Stock')
    await pickTab('Slow movers')
    expect(await screen.findByText('Never Sold Beans')).toBeInTheDocument()
    expect(screen.getAllByText('KES 33,000').length).toBeGreaterThan(0)
    expect(screen.getByText('Never')).toBeInTheDocument()
    expect(screen.getByText('144 days ago')).toBeInTheDocument()
    expect(m.svc.getSlowMovers).toHaveBeenLastCalledWith({ days: 30 })
    await userEvent.click(screen.getByRole('button', { name: '90 days' }))
    await waitFor(() => expect(m.svc.getSlowMovers).toHaveBeenLastCalledWith({ days: 90 }))
  })

  it('exports the chosen calendar dates, not a rolling window', async () => {
    renderPage()
    await screen.findByText('Revenue by Category')
    await pickPeriod('Last month')
    await waitFor(() => expect(m.svc.getSales).toHaveBeenLastCalledWith(monthRange(eatToday(), -1)))
    await screen.findByText('Revenue by Category')
    await userEvent.click(screen.getByRole('button', { name: /export csv/i }))
    await waitFor(() => expect(m.svc.exportCSV).toHaveBeenCalledWith('sales', monthRange(eatToday(), -1)))
  })

  it('offers CSV export to admins only', async () => {
    m.user = { id: 'u', name: 'Sup', role: 'supervisor' }
    renderPage()
    await screen.findByText('Revenue by Category')
    expect(screen.queryByRole('button', { name: /export csv/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument()
  })

  it('prints every row, not the 25 on screen, then puts the screen view back', async () => {
    renderPage()
    await pickGroup('Stock')
    await screen.findByText('Stock Valuation')
    expect(bodyRows()).toBe(25)
    await userEvent.click(screen.getByRole('button', { name: /print/i }))
    await waitFor(() => expect(window.print).toHaveBeenCalled())
    expect(bodyRows()).toBe(60)                                                    // all of them, for the paper
    act(() => { window.dispatchEvent(new Event('afterprint')) })
    await waitFor(() => expect(bodyRows()).toBe(25))
  })
})
