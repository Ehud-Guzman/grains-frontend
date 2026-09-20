import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { BranchProvider, useBranch } from './BranchContext'
import { branchService } from '../services/branch.service'
import { setShopBranchId } from '../services/api'

vi.mock('../services/branch.service', () => ({
  branchService: {
    getAll: vi.fn(),
    nearest: vi.fn(),
  },
}))
vi.mock('../services/api', () => ({
  setShopBranchId: vi.fn(),
  getShopBranchId: vi.fn(),
}))
vi.mock('react-hot-toast', () => {
  const toast = vi.fn()
  toast.success = vi.fn()
  toast.error = vi.fn()
  return { default: toast }
})

const BRANCH_KEY = 'vittorios_shop_branch'

const NAIROBI = { _id: 'b-nairobi', name: 'Nairobi', isDefault: true }
const NAKURU = { _id: 'b-nakuru', name: 'Nakuru', isDefault: false }

let ctx
function Consumer() {
  ctx = useBranch()
  return <span data-testid="branch">{ctx.branch?.name || 'none'}</span>
}

const renderProvider = () =>
  render(
    <BranchProvider>
      <Consumer />
    </BranchProvider>,
  )

/** Install a geolocation stub that grants or denies on demand. */
const stubGeolocation = ({ grant }) => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (success, failure) =>
        grant
          ? success({ coords: { latitude: -1.29, longitude: 36.82 } })
          : failure({ code: 1, PERMISSION_DENIED: 1 }),
    },
  })
}

const manualPick = () =>
  localStorage.setItem(
    BRANCH_KEY,
    JSON.stringify({ branch: NAKURU, distanceKm: null, deliveryAvailable: true, source: 'manual' }),
  )

describe('BranchContext — automatic resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    branchService.getAll.mockResolvedValue({ data: { data: [NAIROBI, NAKURU] } })
  })

  it('adopts the nearest branch when the customer grants geolocation', async () => {
    stubGeolocation({ grant: true })
    branchService.nearest.mockResolvedValue({
      data: { data: { branch: NAKURU, distanceKm: 4.2, deliveryAvailable: true } },
    })

    renderProvider()

    await waitFor(() => expect(screen.getByTestId('branch').textContent).toBe('Nakuru'))
    expect(branchService.nearest).toHaveBeenCalledWith(-1.29, 36.82)
    // Pushed into the api module so public GETs are branch-scoped.
    expect(setShopBranchId).toHaveBeenCalledWith('b-nakuru')
  })

  it('falls back to the default branch when geolocation is denied', async () => {
    stubGeolocation({ grant: false })
    renderProvider()

    await waitFor(() => expect(screen.getByTestId('branch').textContent).toBe('Nairobi'))
    expect(branchService.nearest).not.toHaveBeenCalled()
  })

  it('falls back to the default branch when the nearest lookup fails', async () => {
    stubGeolocation({ grant: true })
    branchService.nearest.mockRejectedValue(new Error('502'))

    renderProvider()

    await waitFor(() => expect(screen.getByTestId('branch').textContent).toBe('Nairobi'))
  })

  it('falls back to the first branch when none is flagged as default', async () => {
    stubGeolocation({ grant: false })
    branchService.getAll.mockResolvedValue({ data: { data: [{ ...NAKURU, isDefault: false }] } })

    renderProvider()



    await waitFor(() => expect(screen.getByTestId('branch').textContent).toBe('Nakuru'))
  })

  it('still resolves when the branch list is unreachable', async () => {
    stubGeolocation({ grant: false })
    branchService.getAll.mockRejectedValue(new Error('offline'))

    renderProvider()

    // Must not throw — the storefront has to render even with a dead backend.
    await waitFor(() => expect(ctx.resolving).toBe(false))
  })

  it('reports deliveryAvailable false from the nearest lookup', async () => {
    stubGeolocation({ grant: true })
    branchService.nearest.mockResolvedValue({
      data: { data: { branch: NAKURU, distanceKm: 84, deliveryAvailable: false } },
    })

    renderProvider()

    await waitFor(() => expect(ctx.deliveryAvailable).toBe(false))
  })
})

describe('BranchContext — manual pick precedence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    branchService.getAll.mockResolvedValue({ data: { data: [NAIROBI, NAKURU] } })
  })

  // A manual pick is the user's explicit word: it wins over geolocation.
  it('honours a stored manual pick and never geolocates over it', async () => {
    stubGeolocation({ grant: true })
    manualPick()

    renderProvider()

    await waitFor(() => expect(screen.getByTestId('branch').textContent).toBe('Nakuru'))
    expect(branchService.nearest).not.toHaveBeenCalled()
  })

  it('seeds the api module from stored state on the very first render', () => {
    manualPick()
    branchService.getAll.mockReturnValue(new Promise(() => {}))

    renderProvider()

    // Synchronous: the first API calls must already be branch-scoped rather than
    // flashing the default branch's catalogue.
    expect(setShopBranchId).toHaveBeenCalledWith('b-nakuru')
    expect(screen.getByTestId('branch').textContent).toBe('Nakuru')
  })

  it('discards a stored manual pick whose branch is no longer active', async () => {
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    })
    branchService.getAll.mockResolvedValue({ data: { data: [NAIROBI] } })
    manualPick()

    renderProvider()

    await waitFor(() => expect(reload).toHaveBeenCalled())
    expect(localStorage.getItem(BRANCH_KEY)).toBeNull()
  })

  it('keeps a manual pick when verification is impossible right now', async () => {
    branchService.getAll.mockRejectedValue(new Error('offline'))
    manualPick()

    renderProvider()

    // A transient backend failure must not disrupt the session — better a stale
    // pick than a surprise branch switch mid-session.
    await waitFor(() => expect(ctx.resolving).toBe(false))
    expect(localStorage.getItem(BRANCH_KEY)).not.toBeNull()
  })

  it('switchBranch persists the pick as manual', async () => {
    stubGeolocation({ grant: false })
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('branch').textContent).toBe('Nairobi'))

    act(() => ctx.switchBranch(NAKURU))

    expect(screen.getByTestId('branch').textContent).toBe('Nakuru')
    const stored = JSON.parse(localStorage.getItem(BRANCH_KEY))
    expect(stored.branch._id).toBe('b-nakuru')
    expect(stored.source).toBe('manual')
  })
})
