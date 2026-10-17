import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminDashboardPage from './AdminDashboardPage'

const m = vi.hoisted(() => ({
  user: { id: 'u', name: 'Test', role: 'admin' },
  kpis: vi.fn(), lowStock: vi.fn(), sales: vi.fn(), best: vi.fn(),
  orders: vi.fn(), overview: vi.fn(), logs: vi.fn(),
}))

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: m.user }) }))
vi.mock('../../context/OnboardingContext', () => ({ useOnboarding: () => ({ getChecklist: () => [] }) }))
vi.mock('../../components/onboarding/OnboardingEnhancements', () => ({ OnboardingChecklistCard: () => null }))
vi.mock('recharts', () => {
  const Pass = ({ children }) => <div>{children}</div>
  return { ResponsiveContainer: Pass, AreaChart: Pass, Area: Pass, XAxis: Pass, YAxis: Pass, CartesianGrid: Pass, Tooltip: Pass }
})
vi.mock('../../services/admin/report.service', () => ({
  adminReportService: { getKPIs: m.kpis, getSales: m.sales, getBestSellers: m.best },
}))
vi.mock('../../services/admin/stock.service', () => ({ adminStockService: { getLowStock: m.lowStock } }))
vi.mock('../../services/admin/order.service', () => ({ adminOrderService: { getAll: m.orders } }))
vi.mock('../../services/admin/controlCenter.service', () => ({ adminControlCenterService: { overview: m.overview } }))
vi.mock('../../services/admin/log.service', () => ({ adminLogService: { getLogs: m.logs } }))

const order = (i) => ({ _id: `o${i}`, orderRef: `ORD-${i}`, status: 'pending', total: 1000, createdAt: new Date().toISOString(), userId: { name: 'Mama Njeri' } })
const KPIS = {
  ordersToday: 3, pendingOrders: 2, revenueToday: 5000, revenueThisMonth: 90000, lowStockCount: 4,
  recentOrders: [order(1)], cashFlow: { paidRevenue: 1, unpaidRevenue: 1, paidOrders: 1, unpaidOrders: 5 },
}

const renderPage = () => render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  m.user = { id: 'u', name: 'Test', role: 'admin' }
  m.kpis.mockResolvedValue({ data: { data: KPIS } })
  m.lowStock.mockResolvedValue({ data: { data: [] } })
  m.sales.mockResolvedValue({ data: { data: { byDay: [] } } })
  m.best.mockResolvedValue({ data: { data: { products: [] } } })
  m.orders.mockImplementation((params) => Promise.resolve({
    data: { data: [order(7), order(8)], pagination: { total: params?.status === 'pending' ? 5 : 2 } },
  }))
  m.logs.mockResolvedValue({ data: { data: { logs: [] } } })
})

describe('business dashboard — by role', () => {
  it('admins see KPIs, the add-product shortcut and the attention chips', async () => {
    renderPage()
    expect(await screen.findByText('Revenue Today (gross)')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /add product/i })).toHaveAttribute('href', '/admin/products/new')
    const strip = screen.getByRole('list', { name: 'Needs attention' })
    expect(within(strip).getByText('2 orders waiting for approval')).toBeInTheDocument()
    expect(within(strip).getByText('4 items low or out of stock')).toBeInTheDocument()
    expect(within(strip).getByText('5 orders awaiting payment this month')).toBeInTheDocument()
  })

  it('supervisors get the numbers but no link to a page they cannot open', async () => {
    m.user = { id: 'u', name: 'Sup', role: 'supervisor' }
    renderPage()
    expect(await screen.findByText('Revenue Today (gross)')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /add product/i })).not.toBeInTheDocument()
  })

  it('staff never call the supervisor-only endpoints, and still get a working page', async () => {
    // /reports/kpis and /stock/low refuse staff. The page used to call both anyway and show
    // nothing but an error.
    m.user = { id: 'u', name: 'Staff', role: 'staff' }
    renderPage()
    expect(await screen.findByText('Pending Orders')).toBeInTheDocument()
    expect(m.kpis).not.toHaveBeenCalled()
    expect(m.lowStock).not.toHaveBeenCalled()
    expect(m.sales).not.toHaveBeenCalled()
    expect(m.best).not.toHaveBeenCalled()
    expect(m.orders).toHaveBeenCalledWith({ limit: 10 })
    expect(m.orders).toHaveBeenCalledWith({ status: 'pending', limit: 1 })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/could not load dashboard/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Revenue Today (gross)')).not.toBeInTheDocument()
    expect(screen.queryByText('Low Stock')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /add product/i })).not.toBeInTheDocument()
    expect(await screen.findByText('ORD-7')).toBeInTheDocument()
  })

  it('shows no attention chips when there is nothing to do', async () => {
    m.kpis.mockResolvedValue({ data: { data: { ...KPIS, pendingOrders: 0, lowStockCount: 0, cashFlow: { ...KPIS.cashFlow, unpaidOrders: 0 } } } })
    renderPage()
    await screen.findByText('Revenue Today (gross)')
    expect(screen.queryByRole('list', { name: 'Needs attention' })).not.toBeInTheDocument()
  })

  it('reports a failure instead of crashing when the KPIs cannot load', async () => {
    m.kpis.mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByText(/could not load dashboard metrics/i)).toBeInTheDocument()
  })
})

describe('superadmin dashboard', () => {
  const branch = (id, name, f, sw = {}) => ({
    id, name, location: 'Nairobi', isActive: true, isDefault: id === 'b1',
    figures: { pendingOrders: 0, oldestPendingAt: null, ordersToday: 0, paidRevenueToday: 0, ...f },
    switches: { platformLocked: false, maintenanceMode: false, ...sw },
  })

  beforeEach(() => {
    m.user = { id: 'u', name: 'Owner', role: 'superadmin' }
    m.overview.mockResolvedValue({ data: { data: {
      generatedAt: new Date().toISOString(),
      health: { database: { connected: true } },
      attention: [
        { id: 'a', severity: 'high', title: 'There is no backup', detail: 'Make one.', link: 'data' },
        { id: 'b', severity: 'info', title: 'Only one superadmin', detail: '', link: 'accounts' },
      ],
      branches: [
        branch('b1', 'Nairobi', { pendingOrders: 4, ordersToday: 10, paidRevenueToday: 30000 }),
        branch('b2', 'Nakuru', { pendingOrders: 1, ordersToday: 5, paidRevenueToday: 12000 }, { platformLocked: true }),
      ],
      accounts: { signedInToday: 2 },
      backups: { latestBackupAt: null },
    } } })
  })

  it('sums the figures across every branch (it used to show a field the API never returns)', async () => {
    renderPage()
    expect(await screen.findByText('Orders today')).toBeInTheDocument()
    const card = (label) => screen.getByText(label).parentElement   // the stat card's own box
    expect(within(card('Orders today')).getByText('15')).toBeInTheDocument()        // 10 + 5
    expect(within(card('Paid revenue today')).getByText('KES 42,000')).toBeInTheDocument() // 30,000 + 12,000
    expect(within(card('Orders waiting')).getByText('5')).toBeInTheDocument()       // 4 + 1
    expect(screen.getByText('1 locked')).toBeInTheDocument()
  })

  it('surfaces urgent items and links to the Control Center', async () => {
    renderPage()
    expect(await screen.findByText('There is no backup')).toBeInTheDocument()
    expect(screen.queryByText('Only one superadmin')).not.toBeInTheDocument() // info is not urgent
    expect(screen.getAllByRole('link', { name: /control center/i })[0]).toHaveAttribute('href', '/admin/control-center')
  })

  it('does not call the single-branch KPI endpoint', async () => {
    renderPage()
    await screen.findByText('Orders today')
    expect(m.kpis).not.toHaveBeenCalled()
  })

  it('shows a retryable error and no fake zeros when the overview fails', async () => {
    m.overview.mockRejectedValue({ response: { data: { message: 'Database unavailable' } } })
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable')
    expect(screen.queryByText('Orders today')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument())
  })
})
