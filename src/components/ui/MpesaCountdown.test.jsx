import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import MpesaCountdown from './MpesaCountdown'
import { paymentService } from '../../services/payment.service'
import { MPESA_POLL_TIMEOUT_SECONDS, MPESA_SUCCESS_REDIRECT_DELAY_MS } from '../../utils/constants'

vi.mock('../../services/payment.service', () => ({
  paymentService: { getStatus: vi.fn() },
}))

const baseProps = {
  orderId: 'order-1',
  orderRef: 'VT-0001',
  phone: '0712345678',
  pollPhone: '0712345678',
  amount: 2385,
  onSuccess: vi.fn(),
  onFailure: vi.fn(),
}

describe('MpesaCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    paymentService.getStatus.mockResolvedValue({ data: { data: { paymentStatus: 'pending' } } })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('polls the status endpoint with the ORDER contact phone, not the STK target', async () => {
    render(<MpesaCountdown {...baseProps} phone="0799999999" pollPhone="0712345678" />)

    await act(async () => { await Promise.resolve() })

    // The status endpoint verifies guest ownership against the contact number;
    // polling with the M-Pesa number would 404 forever.
    expect(paymentService.getStatus).toHaveBeenCalledWith('order-1', '0712345678')
  })

  it('shows the pending state with the amount and order reference', async () => {
    render(<MpesaCountdown {...baseProps} />)
    await act(async () => { await Promise.resolve() })

    expect(screen.getByText('VT-0001')).toBeInTheDocument()
    expect(screen.getByText('KES 2,385')).toBeInTheDocument()
    expect(screen.getByText(/Check Your Phone/i)).toBeInTheDocument()
  })

  it('settles as paid and calls onSuccess after the redirect delay', async () => {
    paymentService.getStatus.mockResolvedValue({ data: { data: { paymentStatus: 'paid' } } })

    render(<MpesaCountdown {...baseProps} />)
    await act(async () => { await Promise.resolve() })

    expect(baseProps.onSuccess).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(MPESA_SUCCESS_REDIRECT_DELAY_MS))
    expect(baseProps.onSuccess).toHaveBeenCalledTimes(1)
  })

  it('settles as failed when M-Pesa reports failure', async () => {
    paymentService.getStatus.mockResolvedValue({ data: { data: { paymentStatus: 'failed' } } })

    render(<MpesaCountdown {...baseProps} />)
    await act(async () => { await Promise.resolve() })

    expect(screen.getByText(/cancelled or failed/i)).toBeInTheDocument()
    expect(baseProps.onSuccess).not.toHaveBeenCalled()
  })

  // settle() must be idempotent: the poll interval and the countdown interval
  // both race to terminate the screen, and a late response must not flip a
  // already-paid screen back to failed.
  it('does not let a late response override a terminal state', async () => {
    paymentService.getStatus.mockResolvedValue({ data: { data: { paymentStatus: 'paid' } } })

    render(<MpesaCountdown {...baseProps} />)
    await act(async () => { await Promise.resolve() })

    paymentService.getStatus.mockResolvedValue({ data: { data: { paymentStatus: 'failed' } } })
    await act(async () => { vi.advanceTimersByTime(5000) })
    await act(async () => { await Promise.resolve() })

    act(() => vi.advanceTimersByTime(MPESA_SUCCESS_REDIRECT_DELAY_MS))
    expect(baseProps.onSuccess).toHaveBeenCalledTimes(1)
  })

  // The countdown owns the timeout specifically so the screen can't hang at
  // "0s checking payment status" when the customer's data connection drops.
  it('times out via the countdown even while status polls keep failing', async () => {
    paymentService.getStatus.mockRejectedValue(new Error('offline'))

    render(<MpesaCountdown {...baseProps} />)
    await act(async () => { await Promise.resolve() })

    await act(async () => { vi.advanceTimersByTime(MPESA_POLL_TIMEOUT_SECONDS * 1000) })

    expect(screen.getByText(/No response received/i)).toBeInTheDocument()
    // The order is saved, so a retry path must be offered rather than a dead end.
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pay on Pickup/i })).toBeInTheDocument()
  })

  it('warns after repeated poll failures but keeps retrying', async () => {
    paymentService.getStatus.mockRejectedValue(new Error('offline'))

    render(<MpesaCountdown {...baseProps} />)

    for (let i = 0; i < 3; i++) {
      await act(async () => { vi.advanceTimersByTime(5000) })
      await act(async () => { await Promise.resolve() })
    }

    expect(screen.getByText(/Having trouble checking payment status/i)).toBeInTheDocument()
  })

  it('offers a switch-payment-method escape from the failed state', async () => {
    paymentService.getStatus.mockResolvedValue({ data: { data: { paymentStatus: 'failed' } } })

    render(<MpesaCountdown {...baseProps} />)
    await act(async () => { await Promise.resolve() })

    act(() => screen.getByRole('button', { name: /Pay on Pickup/i }).click())
    expect(baseProps.onFailure).toHaveBeenCalledWith('switch')

    act(() => screen.getByRole('button', { name: /view my order/i }).click())
    expect(baseProps.onFailure).toHaveBeenCalledWith('continue')
  })

  it('stops polling once unmounted', async () => {
    const { unmount } = render(<MpesaCountdown {...baseProps} />)
    await act(async () => { await Promise.resolve() })
    const callsBefore = paymentService.getStatus.mock.calls.length

    unmount()
    await act(async () => { vi.advanceTimersByTime(30000) })

    expect(paymentService.getStatus.mock.calls.length).toBe(callsBefore)
  })
})
