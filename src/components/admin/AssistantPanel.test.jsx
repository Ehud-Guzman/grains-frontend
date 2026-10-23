import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import AssistantPanel from './AssistantPanel'

const mocks = vi.hoisted(() => ({
  ask: vi.fn(),
  openTopic: vi.fn(),
  topics: vi.fn(),
  unanswered: vi.fn(),
}))

vi.mock('../../services/admin/assistant.service', () => ({ adminAssistantService: mocks }))

const reply = (data) => Promise.resolve({ data: { data } })

const approveAllowed = {
  id: 'orders-approve', kind: 'capability', title: 'Approve an order', summary: 'Accept a pending order.',
  allowed: true, steps: ['Open Orders.', 'Click Approve.'], notes: ['The customer is notified.'],
  page: '/admin/orders', requiredRoles: ['supervisor', 'admin'], blockedReason: null,
}
const approveBlocked = {
  ...approveAllowed, allowed: false, steps: [], notes: [], page: null,
  blockedReason: 'Only supervisors and admins can do this — you are signed in as staff.',
}

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

const renderPanel = ({ role = 'staff', onClose = vi.fn() } = {}) => {
  render(
    <MemoryRouter initialEntries={['/admin/dashboard']}>
      <Routes>
        <Route path="*" element={<><Where /><AssistantPanel userRole={role} onClose={onClose} /></>} />
      </Routes>
    </MemoryRouter>,
  )
  return { onClose }
}

beforeEach(() => {
  Object.values(mocks).forEach(m => m.mockReset())
  mocks.topics.mockImplementation(() => reply({
    areas: [
      { key: 'orders', label: 'Orders', items: [
        { id: 'orders-view', title: 'View and search orders', allowed: true },
        { id: 'orders-approve', title: 'Approve an order', allowed: false },
      ] },
    ],
    notSupported: [{ id: 'no-delete-order', title: 'Delete an order' }],
    suggestions: [{ id: 'orders-view', title: 'View and search orders' }],
  }))
})

describe('AssistantPanel', () => {
  it('is a labelled dialog with starter suggestions', async () => {
    renderPanel()
    expect(screen.getByRole('dialog', { name: 'Help assistant' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'View and search orders' })).toBeInTheDocument()
  })

  it('answers a typed question with numbered steps and a link that opens the page', async () => {
    mocks.ask.mockImplementation(() => reply({ outcome: 'answered', message: 'Yes — you can do that. Here is how:', results: [approveAllowed], suggestions: [] }))
    const { onClose } = renderPanel({ role: 'supervisor' })
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Your question'), 'how do I approve an order?')
    await user.click(screen.getByRole('button', { name: 'Send question' }))

    expect(mocks.ask).toHaveBeenCalledWith('how do I approve an order?')
    expect(await screen.findByText('Yes — you can do that. Here is how:')).toBeInTheDocument()
    expect(screen.getByText('Open Orders.')).toBeInTheDocument()
    expect(screen.getByText('The customer is notified.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Take me there/ }))
    expect(onClose).toHaveBeenCalled()
    expect(screen.getByTestId('where')).toHaveTextContent('/admin/orders')
  })

  it('shows why a role cannot do something, without steps or a link', async () => {
    mocks.ask.mockImplementation(() => reply({ outcome: 'needs_role', message: 'The system can do that, but not with your role.', results: [approveBlocked], suggestions: [] }))
    renderPanel()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Your question'), 'approve an order')
    await user.click(screen.getByRole('button', { name: 'Send question' }))

    expect(await screen.findByText(/signed in as staff/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Take me there/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Click Approve.')).not.toBeInTheDocument()
  })

  it('says plainly when the system cannot do it, and what to do instead', async () => {
    mocks.ask.mockImplementation(() => reply({
      outcome: 'not_supported', message: 'No, the system cannot do that.',
      results: [{ id: 'no-delete-order', kind: 'not_supported', title: 'Delete an order', summary: 'Orders cannot be deleted.', workaround: 'Cancel the order instead.', allowed: false }],
      suggestions: [],
    }))
    renderPanel()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Your question'), 'delete an order')
    await user.click(screen.getByRole('button', { name: 'Send question' }))

    expect(await screen.findByText('No, the system cannot do that.')).toBeInTheDocument()
    expect(screen.getByText('Orders cannot be deleted.')).toBeInTheDocument()
    expect(screen.getByText(/Cancel the order instead/)).toBeInTheDocument()
  })

  it('offers close matches when nothing matched, and tapping one asks for that topic', async () => {
    mocks.ask.mockImplementation(() => reply({ outcome: 'no_match', message: 'I could not find anything.', results: [], suggestions: [{ id: 'orders-view', title: 'View and search orders' }] }))
    mocks.openTopic.mockImplementation(() => reply({ outcome: 'answered', message: 'Yes — you can do that. Here is how:', results: [{ ...approveAllowed, id: 'orders-view', title: 'View and search orders' }], suggestions: [] }))
    renderPanel()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Your question'), 'purple elephants')
    await user.click(screen.getByRole('button', { name: 'Send question' }))
    await screen.findByText('I could not find anything.')

    // The suggestion also appears among the starters, so take the last one (inside the answer).
    const chips = screen.getAllByRole('button', { name: 'View and search orders' })
    await user.click(chips[chips.length - 1])
    expect(mocks.openTopic).toHaveBeenCalledWith('orders-view')
    expect(await screen.findByText('Open Orders.')).toBeInTheDocument()
  })

  it('does not send a one-character question', async () => {
    renderPanel()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Your question'), 'a')
    expect(screen.getByRole('button', { name: 'Send question' })).toBeDisabled()
    expect(mocks.ask).not.toHaveBeenCalled()
  })

  it('keeps working when the server cannot be reached', async () => {
    mocks.ask.mockImplementation(() => Promise.reject(new Error('network')))
    renderPanel()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Your question'), 'approve an order')
    await user.click(screen.getByRole('button', { name: 'Send question' }))

    expect(await screen.findByText(/could not reach the server/)).toBeInTheDocument()
    expect(screen.getByLabelText('Your question')).toBeEnabled()
  })

  it('browse lists everything, marks what needs a higher role, and opens a topic', async () => {
    mocks.openTopic.mockImplementation(() => reply({ outcome: 'needs_role', message: 'The system can do that, but not with your role.', results: [approveBlocked], suggestions: [] }))
    renderPanel()
    const user = userEvent.setup()

    await user.click(screen.getByRole('tab', { name: /Browse/ }))
    expect(await screen.findByText('View and search orders')).toBeInTheDocument()
    expect(screen.getByLabelText('Needs a higher role')).toBeInTheDocument()
    expect(screen.getByText('Delete an order')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Approve an order/ }))
    expect(mocks.openTopic).toHaveBeenCalledWith('orders-approve')
    expect(await screen.findByText(/signed in as staff/)).toBeInTheDocument()
  })

  it('only the superadmin gets the unanswered-questions tab', async () => {
    mocks.unanswered.mockImplementation(() => reply([
      { outcome: 'no_match', example: 'purple elephants', count: 3, lastAsked: '2026-10-20', roles: ['admin', 'staff'], topMatchId: null },
    ]))
    const first = render(
      <MemoryRouter><AssistantPanel userRole="admin" onClose={vi.fn()} /></MemoryRouter>,
    )
    expect(screen.queryByRole('tab', { name: /Unanswered/ })).not.toBeInTheDocument()
    first.unmount()

    renderPanel({ role: 'superadmin' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: /Unanswered/ }))
    await waitFor(() => expect(screen.getByText(/purple elephants/)).toBeInTheDocument())
    expect(screen.getByText(/Asked 3×/)).toBeInTheDocument()
  })

  it('Escape closes it', async () => {
    const { onClose } = renderPanel()
    const user = userEvent.setup()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
