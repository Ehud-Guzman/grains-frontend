import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import OnboardingLayer from './OnboardingLayer'

const mocks = vi.hoisted(() => ({
  user: null,
  closeHelpCenter: vi.fn(),
  shop: { ask: vi.fn(), openTopic: vi.fn(), topics: vi.fn() },
  driver: { ask: vi.fn(), openTopic: vi.fn(), topics: vi.fn() },
}))

vi.mock('../../context/OnboardingContext', () => ({
  useOnboarding: () => ({
    helpCenterOpen: true,
    openHelpCenter: vi.fn(),
    closeHelpCenter: mocks.closeHelpCenter,
    currentExperience: 'public',
    getChecklist: () => [],
  }),
}))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }))
vi.mock('../../services/assistant.service', () => ({
  shopAssistantService: mocks.shop,
  driverAssistantService: mocks.driver,
}))

const reply = (data) => Promise.resolve({ data: { data } })
const topicsFor = (title) => reply({
  areas: [{ key: 'a', label: 'Area', items: [{ id: 'x', title, allowed: true }] }],
  notSupported: [],
  suggestions: [{ id: 'x', title }],
  intro: `Intro for ${title}`,
})

function Where() { return <p data-testid="where">{useLocation().pathname}</p> }

const renderLayer = () => render(
  <MemoryRouter initialEntries={['/shop']}>
    <Routes><Route path="*" element={<><Where /><OnboardingLayer /></>} /></Routes>
  </MemoryRouter>,
)

beforeEach(() => {
  mocks.user = null
  mocks.closeHelpCenter.mockReset()
  for (const svc of [mocks.shop, mocks.driver]) Object.values(svc).forEach(m => m.mockReset())
  mocks.shop.topics.mockImplementation(() => topicsFor('Track an order'))
  mocks.driver.topics.mockImplementation(() => topicsFor('Mark a delivery as done'))
})

describe('Help Center — Ask tab', () => {
  it('a visitor lands on Ask, with the shop assistant\'s introduction and starters', async () => {
    renderLayer()
    expect(screen.getByRole('button', { name: 'Ask' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('Intro for Track an order')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Track an order' })).toBeInTheDocument()
    expect(mocks.driver.topics).not.toHaveBeenCalled()
  })

  it('answers a question and "Take me there" closes the Help Center and goes to the page', async () => {
    mocks.shop.ask.mockImplementation(() => reply({
      outcome: 'answered', message: 'Yes — you can do that. Here is how:',
      results: [{ id: 'track-order', kind: 'capability', title: 'Track an order', summary: 'See where it is.', allowed: true, steps: ['Open Track Order.'], notes: [], page: '/track', blockedReason: null }],
      suggestions: [],
    }))
    renderLayer()
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Your question'), 'where is my order')
    await user.click(screen.getByRole('button', { name: 'Send question' }))

    expect(mocks.shop.ask).toHaveBeenCalledWith('where is my order')
    expect(await screen.findByText('Open Track Order.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Take me there/ }))
    expect(mocks.closeHelpCenter).toHaveBeenCalled()
    expect(screen.getByTestId('where')).toHaveTextContent('/track')
  })

  it('shows a visitor why something needs an account', async () => {
    mocks.shop.ask.mockImplementation(() => reply({
      outcome: 'needs_role', message: 'The system can do that, but not with your role.',
      results: [{ id: 'cancel-order', kind: 'capability', title: 'Cancel my order', summary: 'Cancel while pending.', allowed: false, steps: [], notes: [], page: null, blockedReason: 'You need to sign in first — or create a free account — to do this.' }],
      suggestions: [],
    }))
    renderLayer()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Your question'), 'cancel my order')
    await user.click(screen.getByRole('button', { name: 'Send question' }))
    expect(await screen.findByText(/You need to sign in first/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Take me there/ })).not.toBeInTheDocument()
  })

  it('a signed-in customer uses the shop assistant too', async () => {
    mocks.user = { id: 'c1', role: 'customer' }
    renderLayer()
    expect(await screen.findByText('Intro for Track an order')).toBeInTheDocument()
    expect(mocks.driver.topics).not.toHaveBeenCalled()
  })

  it('a driver gets the driver assistant, not the shop one', async () => {
    mocks.user = { id: 'd1', role: 'driver' }
    mocks.driver.ask.mockImplementation(() => reply({ outcome: 'answered', message: 'Yes — you can do that. Here is how:', results: [], suggestions: [] }))
    renderLayer()
    const user = userEvent.setup()

    expect(await screen.findByText('Intro for Mark a delivery as done')).toBeInTheDocument()
    expect(mocks.shop.topics).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Your question'), 'mark delivered')
    await user.click(screen.getByRole('button', { name: 'Send question' }))
    expect(mocks.driver.ask).toHaveBeenCalledWith('mark delivered')
    expect(mocks.shop.ask).not.toHaveBeenCalled()
  })

  it('staff do not get an Ask tab here — they have the one in the admin top bar', async () => {
    for (const role of ['staff', 'supervisor', 'admin', 'superadmin']) {
      mocks.user = { id: 'a1', role }
      const { unmount } = renderLayer()
      expect(screen.queryByRole('button', { name: 'Ask' })).not.toBeInTheDocument()
      expect(screen.queryByRole('tab', { name: 'Chat' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument()
      unmount()
    }
    expect(mocks.shop.topics).not.toHaveBeenCalled()
    expect(mocks.driver.topics).not.toHaveBeenCalled()
  })

  it('keeps the conversation when you look at another tab and come back', async () => {
    mocks.shop.ask.mockImplementation(() => reply({ outcome: 'answered', message: 'Yes — you can do that. Here is how:', results: [], suggestions: [] }))
    renderLayer()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Your question'), 'track my order')
    await user.click(screen.getByRole('button', { name: 'Send question' }))
    await screen.findByText('Yes — you can do that. Here is how:')

    await user.click(screen.getByRole('button', { name: 'Tips' }))
    await waitFor(() => expect(screen.getByText('Bulk orders save more')).toBeVisible())
    await user.click(screen.getByRole('button', { name: 'Ask' }))
    expect(screen.getByText('Yes — you can do that. Here is how:')).toBeVisible()
  })
})
