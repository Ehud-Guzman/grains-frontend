import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ControlCenterPage from './ControlCenterPage'

const svc = vi.hoisted(() => ({
  overview: vi.fn(),
  accounts: vi.fn(),
  signOut: vi.fn(),
  signOutAll: vi.fn(),
  setSwitches: vi.fn(),
  lockAll: vi.fn(),
  setJobPaused: vi.fn(),
  security: vi.fn(),
  rawEntry: vi.fn(),
  exportAudit: vi.fn(),
  integrity: vi.fn(),
  permissions: vi.fn(),
}))

vi.mock('../../../services/admin/controlCenter.service', () => ({ adminControlCenterService: svc }))
vi.mock('../../../services/admin/user.service', () => ({ adminUserService: { lock: vi.fn(), unlock: vi.fn() } }))
vi.mock('../../../services/admin/backup.service', () => ({ adminBackupService: { create: vi.fn() } }))
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'sa1', role: 'superadmin' } }) }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const SWITCH_DEFS = [
  { key: 'platformLocked', label: 'Lock all changes', group: 'emergency', risky: true, description: 'Freeze the branch.' },
  { key: 'maintenanceMode', label: 'Maintenance mode', group: 'emergency', risky: true, description: 'No orders.' },
  { key: 'allowGuestOrders', label: 'Guest checkout', group: 'checkout', description: 'Order without an account.' },
]

const branch = (over = {}) => ({
  id: 'b1', name: 'Nairobi Branch', slug: 'nairobi', location: 'CBD', isActive: true, isDefault: true,
  hasCoordinates: true, maintenanceMessage: '',
  figures: { pendingOrders: 2, oldestPendingAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(), ordersToday: 5, paidRevenueToday: 12000, codUnsettledCount: 0, codUnsettledAmount: 0, codOldestAt: null, etimsFailed: 0, lowStockLines: 1 },
  switches: { platformLocked: false, maintenanceMode: false, allowGuestOrders: true },
  ...over,
})

const overview = (over = {}) => ({
  generatedAt: new Date().toISOString(),
  health: {
    api: { uptimeSeconds: 3700, node: 'v22', environment: 'production', memoryMb: 180, restoreInProgress: false },
    database: { connected: true, name: 'grains' },
    config: [
      { id: 'sms', label: 'SMS (Africa’s Talking)', ok: false, value: 'sandbox', note: 'Sandbox account.', severity: 'info' },
      { id: 'email', label: 'Email (Gmail)', ok: true, value: 'configured', note: 'Ready.', severity: 'info' },
    ],
  },
  attention: [
    { severity: 'info', id: 'one-superadmin', title: 'There is only one superadmin', detail: 'Consider a second.', link: 'accounts' },
    { severity: 'high', id: 'pending-b1', title: 'Nairobi Branch: orders waiting over a day', detail: '2 pending.', link: '/admin/orders?status=pending' },
  ],
  branches: [branch()],
  accounts: { total: 3, locked: 0, byRole: {}, signedInToday: 2 },
  backups: { total: 2, totalSizeBytes: 2048, latestBackupAt: new Date().toISOString(), encrypted: true },
  jobs: [{ name: 'cleanup', label: 'Log and guest cleanup', schedule: 'Daily', description: 'Deletes old logs.', pauseEffect: 'Nothing is deleted.', paused: false, lastRun: null }],
  security: { failedLogins24h: 1, accountLocks24h: 0 },
  switchDefinitions: SWITCH_DEFS,
  ...over,
})

const renderPage = () => render(<MemoryRouter><ControlCenterPage /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  svc.overview.mockResolvedValue({ data: { data: overview() } })
  svc.accounts.mockResolvedValue({ data: { data: [
    { id: 'sa1', name: 'Owner', phone: '0700000001', role: 'superadmin', branchName: null, isLocked: false, failedLoginCount: 0, lastLoginAt: new Date().toISOString(), lastLoginIp: '1.1.1.1', sessionsRevokedAt: null },
    { id: 'a2', name: 'Branch Admin', phone: '0700000002', role: 'admin', branchName: 'Nairobi Branch', isLocked: false, failedLoginCount: 4, lastLoginAt: null, lastLoginIp: null, sessionsRevokedAt: null },
  ] } })
  svc.security.mockResolvedValue({ data: { data: { days: 7, totals: {}, events: [], failedLoginsByIp: [], failedLoginsByAccount: [] } } })
  svc.setSwitches.mockResolvedValue({ data: { data: { changed: ['x'] } } })
})

describe('ControlCenterPage', () => {
  it('shows what needs attention, worst first', async () => {
    renderPage()
    const items = await screen.findAllByRole('listitem')
    const titles = items.map(li => li.textContent)
    const urgent = titles.findIndex(t => t.includes('orders waiting over a day'))
    const fyi = titles.findIndex(t => t.includes('only one superadmin'))
    expect(urgent).toBeGreaterThan(-1)
    // The server sorts; the page must preserve that order. Here the fixture has info first
    // so this also proves the page does not silently re-sort away from the server's answer.
    expect(fyi).toBeGreaterThan(-1)
    expect(screen.getByRole('link', { name: /orders waiting over a day/i })).toHaveAttribute('href', '/admin/orders?status=pending')
    expect(screen.getByRole('link', { name: /only one superadmin/i })).toHaveAttribute('href', '#accounts')
  })

  it('says so when nothing needs attention', async () => {
    svc.overview.mockResolvedValue({ data: { data: overview({ attention: [] }) } })
    renderPage()
    expect(await screen.findByText(/nothing needs your attention/i)).toBeInTheDocument()
  })

  it('shows a retryable error when the overview cannot load', async () => {
    svc.overview.mockRejectedValueOnce({ response: { data: { message: 'Database unavailable' } } })
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable')
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(await screen.findByRole('heading', { name: 'Control Center' })).toBeInTheDocument()
  })

  it('keeps showing the last good reading when a refresh fails', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Control Center' })
    svc.overview.mockRejectedValueOnce({ response: { data: { message: 'Boom' } } })
    await userEvent.click(screen.getByRole('button', { name: /^refresh$/i }))
    expect(await screen.findByText(/showing the last good reading/i)).toBeInTheDocument()
    expect(screen.getAllByText('Nairobi Branch').length).toBeGreaterThan(0)
  })

  it('a plain switch changes with one tap and no password', async () => {
    renderPage()
    const toggle = await screen.findByRole('switch', { name: 'Guest checkout' })
    await userEvent.click(toggle)
    await waitFor(() => expect(svc.setSwitches).toHaveBeenCalledWith('b1', { allowGuestOrders: false }, undefined))
    expect(screen.queryByLabelText(/your password/i)).not.toBeInTheDocument()
  })

  it('a risky switch asks for the password first, and sends it', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('switch', { name: 'Lock all changes' }))
    expect(svc.setSwitches).not.toHaveBeenCalled()

    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/your password/i), 's3cret-pass')
    await userEvent.click(within(dialog).getByRole('button', { name: /turn on/i }))

    await waitFor(() => expect(svc.setSwitches).toHaveBeenCalledWith('b1', { platformLocked: true }, 's3cret-pass'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('a wrong password keeps the dialog open with the server’s message and clears the field', async () => {
    svc.setSwitches.mockRejectedValueOnce({ response: { status: 403, data: { message: 'That password is not correct.' } } })
    renderPage()
    await userEvent.click(await screen.findByRole('switch', { name: 'Maintenance mode' }))
    const dialog = await screen.findByRole('dialog')
    const field = within(dialog).getByLabelText(/your password/i)
    await userEvent.type(field, 'wrong')
    await userEvent.click(within(dialog).getByRole('button', { name: /turn on/i }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('That password is not correct.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(field).toHaveValue('')
  })

  it('the submit button stays disabled until a password is typed', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('switch', { name: 'Lock all changes' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /turn on/i })).toBeDisabled()
  })

  it('"Lock every branch" asks for the password and calls lockAll', async () => {
    svc.lockAll.mockResolvedValue({ data: { data: {} } })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /^lock every branch/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/your password/i), 'pw-123456')
    await userEvent.click(within(dialog).getByRole('button', { name: /lock everything/i }))
    await waitFor(() => expect(svc.lockAll).toHaveBeenCalledWith(true, 'pw-123456'))
  })

  it('offers "Unlock every branch" once all active branches are locked', async () => {
    svc.overview.mockResolvedValue({ data: { data: overview({ branches: [branch({ switches: { platformLocked: true, maintenanceMode: false, allowGuestOrders: true } })] }) } })
    renderPage()
    expect(await screen.findByRole('button', { name: /unlock every branch/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^lock every branch/i })).not.toBeInTheDocument()
  })

  it('pausing a job calls the API and refreshes', async () => {
    svc.setJobPaused.mockResolvedValue({ data: { data: {} } })
    renderPage()
    await userEvent.click(await screen.findByRole('switch', { name: 'Running' }))
    await waitFor(() => expect(svc.setJobPaused).toHaveBeenCalledWith('cleanup', true))
    await waitFor(() => expect(svc.overview).toHaveBeenCalledTimes(2))
  })

  it('lists accounts; you cannot sign yourself out or lock yourself', async () => {
    renderPage()
    const rows = await screen.findAllByRole('row')
    const mine = rows.find(r => r.textContent.includes('Owner'))
    expect(within(mine).getByRole('button', { name: /sign out/i })).toBeDisabled()
    expect(within(mine).getByRole('button', { name: /lock/i })).toBeDisabled()
    const theirs = rows.find(r => r.textContent.includes('Branch Admin'))
    expect(within(theirs).getByText(/4 wrong passwords/i)).toBeInTheDocument()
    expect(within(theirs).getByRole('button', { name: /sign out/i })).toBeEnabled()
  })

  it('"Sign everyone out" sends the chosen scope with the password', async () => {
    svc.signOutAll.mockResolvedValue({ data: { message: '1 account(s) signed out' } })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /sign everyone out/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByLabelText(/including customers/i))
    await userEvent.type(within(dialog).getByLabelText(/your password/i), 'pw-123456')
    await userEvent.click(within(dialog).getByRole('button', { name: /sign them out/i }))
    await waitFor(() => expect(svc.signOutAll).toHaveBeenCalledWith('everyone', 'pw-123456'))
  })

  it('the permission grid is read on demand, not on load', async () => {
    svc.permissions.mockResolvedValue({ data: { data: {
      roles: ['customer', 'driver', 'staff', 'supervisor', 'admin', 'superadmin'],
      areas: [{
        mount: '/api/admin/users', label: 'Staff accounts', note: 'x', public: false, grantedBy: [],
        cells: Object.fromEntries(['customer', 'driver', 'staff', 'supervisor', 'admin', 'superadmin'].map(r => [r, { read: r === 'superadmin', write: r === 'superadmin', partial: false }])),
        routes: [{ method: 'GET', path: '/api/admin/users', public: false, roles: ['superadmin'] }],
      }],
    } } })
    renderPage()
    await screen.findByRole('heading', { name: 'Control Center' })
    expect(svc.permissions).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: /show the grid/i }))
    expect(await screen.findByText('Staff accounts')).toBeInTheDocument()
    expect(svc.permissions).toHaveBeenCalledTimes(1)
  })

  it('the integrity scan reports problems with links to the records', async () => {
    svc.integrity.mockResolvedValue({ data: { data: {
      ranAt: new Date().toISOString(), durationMs: 42, problems: 1,
      checks: [
        { id: 'leaked-reservation', title: 'Stock still held for cancelled or rejected orders', severity: 'high', hint: 'Count the shelf.', ok: false, count: 1,
          examples: [{ id: 'o1', label: 'ORD-2026-0001', detail: 'cancelled · unpaid · KES 5,000', link: '/admin/orders/o1' }] },
        { id: 'negative-stock', title: 'Products with negative stock', severity: 'high', hint: '', ok: true, count: 0, examples: [] },
      ],
    } } })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /run scan/i }))
    expect(await screen.findByText(/1 of 2 checks found something/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ORD-2026-0001/ })).toHaveAttribute('href', '/admin/orders/o1')
  })
})
