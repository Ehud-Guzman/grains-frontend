import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AdminLayout from './AdminLayout'

const mocks = vi.hoisted(() => ({
  user: { id: 'u1', name: 'Wanjiru Kamau', role: 'staff' },
  branch: { id: 'b1', name: 'Nairobi Branch' },
  get: vi.fn(),
  overview: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, currentBranch: mocks.branch, logout: mocks.logout }),
}))
vi.mock('../../services/api', () => ({ default: { get: mocks.get } }))
vi.mock('../../services/admin/controlCenter.service', () => ({
  adminControlCenterService: { overview: mocks.overview },
}))

const renderAt = (path = '/admin/dashboard') => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<p>dashboard page</p>} />
        <Route path="orders" element={<p>orders page</p>} />
        <Route path="stock/intake" element={<p>intake page</p>} />
        <Route path="coupons" element={<p>coupons page</p>} />
      </Route>
      <Route path="/login" element={<p>login page</p>} />
    </Routes>
  </MemoryRouter>,
)

// The desktop sidebar is the first <nav>; the drawer (when open) renders a second one in a portal.
const sidebarNav = () => screen.getAllByRole('navigation', { name: 'Admin' })[0]

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mocks.user = { id: 'u1', name: 'Wanjiru Kamau', role: 'staff' }
  mocks.get.mockImplementation((url) => {
    if (url.startsWith('/admin/orders')) return Promise.resolve({ data: { pagination: { total: 4 } } })
    if (url.startsWith('/admin/stock/low')) return Promise.resolve({ data: { data: [{}, {}] } })
    return Promise.reject(new Error(`unexpected ${url}`))
  })
  mocks.overview.mockResolvedValue({ data: { data: { attention: [] } } })
})

describe('AdminLayout — navigation by role', () => {
  it('shows staff only what they can use', () => {
    renderAt()
    const nav = within(sidebarNav())
    expect(nav.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    expect(nav.getByRole('link', { name: /orders/i })).toBeInTheDocument()
    expect(nav.getByRole('link', { name: /stock/i })).toBeInTheDocument()
    expect(nav.queryByRole('link', { name: /products/i })).not.toBeInTheDocument()
    expect(nav.queryByRole('link', { name: /settings/i })).not.toBeInTheDocument()
  })

  it('gives the superadmin the Control Center and marks business pages view-only', async () => {
    mocks.user = { id: 'u1', name: 'Owner', role: 'superadmin' }
    renderAt()
    const nav = within(sidebarNav())
    expect(nav.getByRole('link', { name: /control center/i })).toHaveAttribute('href', '/admin/control-center')
    expect(nav.getByText('Observe (View Only)')).toBeInTheDocument()
    expect(screen.getAllByText('Platform Control').length).toBeGreaterThan(0)
  })

  it('shows the branch the admin is working in', () => {
    renderAt()
    expect(screen.getAllByText('Nairobi Branch').length).toBeGreaterThan(0)
  })

  it('titles the page from the URL, including pages that used to say "Admin"', () => {
    renderAt('/admin/coupons')
    expect(screen.getAllByText('Coupons').length).toBeGreaterThan(0)
    expect(screen.queryByText('Admin', { selector: 'p.text-base' })).not.toBeInTheDocument()
  })

  it('marks the current page for assistive tech', () => {
    renderAt('/admin/orders')
    expect(within(sidebarNav()).getByRole('link', { name: /orders/i })).toHaveAttribute('aria-current', 'page')
  })
})

describe('AdminLayout — alerts', () => {
  it('staff still get their pending-orders count when the stock request is refused', async () => {
    // Staff may read orders but /admin/stock/low is supervisor+. The two used to share one
    // Promise.all, so the 403 threw away the orders count and the bell stayed empty.
    mocks.get.mockImplementation((url) => {
      if (url.startsWith('/admin/orders')) return Promise.resolve({ data: { pagination: { total: 4 } } })
      return Promise.reject({ response: { status: 403 } })
    })
    renderAt()
    expect(await screen.findByRole('button', { name: /alerts, 4 need attention/i })).toBeInTheDocument()
    expect(mocks.get).not.toHaveBeenCalledWith('/admin/stock/low')
  })

  it('supervisors get both pending orders and low stock, with badges on the nav', async () => {
    mocks.user = { id: 'u1', name: 'Sup', role: 'supervisor' }
    renderAt()
    expect(await screen.findByRole('button', { name: /alerts, 6 need attention/i })).toBeInTheDocument()
    const nav = within(sidebarNav())
    expect(await nav.findByRole('link', { name: /orders.*4 need attention/i })).toBeInTheDocument()
    expect(nav.getByRole('link', { name: /stock.*2 need attention/i })).toBeInTheDocument()
  })

  it('the bell lists what needs attention and closes on Escape', async () => {
    mocks.user = { id: 'u1', name: 'Sup', role: 'supervisor' }
    renderAt()
    const bell = await screen.findByRole('button', { name: /alerts, 6/i })
    await userEvent.click(bell)
    const panel = screen.getByRole('region', { name: 'Alerts' })
    expect(within(panel).getByText('4 pending orders')).toBeInTheDocument()
    expect(within(panel).getByText('2 low stock items')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Alerts' })).not.toBeInTheDocument()
  })

  it('shows an explicit all-clear', async () => {
    mocks.get.mockResolvedValue({ data: { pagination: { total: 0 }, data: [] } })
    renderAt()
    await userEvent.click(await screen.findByRole('button', { name: /alerts, none need attention/i }))
    expect(screen.getByText(/all clear/i)).toBeInTheDocument()
  })

  it('the superadmin bell is fed by the Control Center attention list, not the order queue', async () => {
    mocks.user = { id: 'u1', name: 'Owner', role: 'superadmin' }
    mocks.overview.mockResolvedValue({ data: { data: { attention: [
      { id: 'a', severity: 'high', title: 'No backup', detail: 'Nothing backed up.', link: 'data' },
      { id: 'b', severity: 'medium', title: 'Branch locked', detail: 'x', link: 'switches' },
      { id: 'c', severity: 'info', title: 'Only one superadmin', detail: 'y', link: 'accounts' },
    ] } } })
    renderAt()
    const bell = await screen.findByRole('button', { name: /alerts, 2 need attention/i })
    expect(mocks.get).not.toHaveBeenCalled()
    await userEvent.click(bell)
    const panel = screen.getByRole('region', { name: 'Alerts' })
    expect(within(panel).getByText('No backup')).toBeInTheDocument()
    expect(within(panel).queryByText('Only one superadmin')).not.toBeInTheDocument() // info is not an alert
    expect(within(sidebarNav()).getByRole('link', { name: /control center.*2 need attention/i })).toBeInTheDocument()
  })
})

describe('AdminLayout — sidebar', () => {
  it('collapses to an icon rail, keeps links reachable by name, and remembers the choice', async () => {
    const { unmount } = renderAt()
    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
    expect(within(sidebarNav()).getByRole('link', { name: /orders/i })).toBeInTheDocument()
    expect(localStorage.getItem('admin.sidebarCollapsed')).toBe('1')

    unmount()
    renderAt()
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
  })

  it('still works when browser storage is unavailable', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    renderAt()
    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
    spy.mockRestore(); set.mockRestore()
  })

  it('does not remount the sidebar when the alert counts refresh', async () => {
    mocks.user = { id: 'u1', name: 'Sup', role: 'supervisor' }
    renderAt()
    const nav = sidebarNav()
    await screen.findByRole('button', { name: /alerts, 6/i })
    expect(sidebarNav()).toBe(nav) // same DOM node after the counts arrived
  })

  it('signs out and goes to the login page', async () => {
    mocks.logout.mockResolvedValue()
    renderAt()
    await userEvent.click(screen.getAllByRole('button', { name: /sign out/i })[0])
    await waitFor(() => expect(screen.getByText('login page')).toBeInTheDocument())
  })
})

describe('AdminLayout — mobile drawer', () => {
  it('opens as a dialog, closes on Escape, and closes after choosing a page', async () => {
    renderAt()
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    const dialog = screen.getByRole('dialog', { name: 'Navigation menu' })
    expect(within(dialog).getByRole('link', { name: /orders/i })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: /orders/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('orders page')).toBeInTheDocument()
  })
})
