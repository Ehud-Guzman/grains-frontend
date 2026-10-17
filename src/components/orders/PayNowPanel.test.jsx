import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PayNowPanel from './PayNowPanel'
import { paymentService } from '../../services/payment.service'

vi.mock('../../services/payment.service', () => ({
  paymentService: { initiate: vi.fn(), changeMethod: vi.fn(), getStatus: vi.fn() },
}))
vi.mock('../../context/AppSettingsContext', () => ({
  useAppSettings: () => ({ orderSettings: { allowMpesa: true, allowPayOnPickup: true, allowCashOnDelivery: true } }),
}))
vi.mock('../ui/MpesaCountdown', () => ({ default: () => <div>countdown</div> }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const order = (over = {}) => ({
  _id: 'o1', orderRef: 'ORD-1', total: 1500, status: 'pending',
  paymentMethod: 'mpesa', paymentStatus: 'failed', deliveryMethod: 'pickup', ...over,
})

describe('PayNowPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders nothing once the order is paid, refunded, or past approval', () => {
    for (const o of [order({ paymentStatus: 'paid' }), order({ paymentStatus: 'refunded' }), order({ status: 'approved' }), order({ status: 'cancelled' })]) {
      const { container, unmount } = render(<PayNowPanel order={o} />)
      expect(container).toBeEmptyDOMElement()
      unmount()
    }
  })

  it('sends an M-Pesa prompt to the number typed and shows the countdown', async () => {
    paymentService.initiate.mockResolvedValue({})
    render(<PayNowPanel order={order()} defaultPhone="0712345678" contactPhone="0700000000" />)
    fireEvent.click(screen.getByRole('button', { name: /pay with m-pesa/i }))
    fireEvent.change(screen.getByLabelText(/m-pesa number/i), { target: { value: '0799 111 222' } })
    fireEvent.click(screen.getByRole('button', { name: /send m-pesa prompt/i }))
    await waitFor(() => expect(screen.getByText('countdown')).toBeInTheDocument())
    expect(paymentService.initiate).toHaveBeenCalledWith('o1', '0799111222', '0700000000')
    expect(paymentService.changeMethod).not.toHaveBeenCalled()
  })

  it('rejects a bad number without calling the server', () => {
    render(<PayNowPanel order={order()} />)
    fireEvent.click(screen.getByRole('button', { name: /pay with m-pesa/i }))
    fireEvent.change(screen.getByLabelText(/m-pesa number/i), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: /send m-pesa prompt/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/valid m-pesa number/i)
    expect(paymentService.initiate).not.toHaveBeenCalled()
  })

  it('really switches the order to pay-on-pickup', async () => {
    paymentService.changeMethod.mockResolvedValue({})
    const onChanged = vi.fn()
    render(<PayNowPanel order={order()} contactPhone="0712345678" onChanged={onChanged} />)
    fireEvent.click(screen.getByRole('button', { name: /pay on pickup instead/i }))
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith({ paymentMethod: 'pickup', paymentStatus: 'unpaid' }))
    expect(paymentService.changeMethod).toHaveBeenCalledWith('o1', 'pickup', '0712345678')
  })

  it('offers pay-on-delivery for delivery orders', () => {
    render(<PayNowPanel order={order({ deliveryMethod: 'delivery' })} />)
    expect(screen.getByRole('button', { name: /pay on delivery instead/i })).toBeInTheDocument()
  })

  it('lets a cash order switch to M-Pesa first, then prompts', async () => {
    paymentService.changeMethod.mockResolvedValue({})
    paymentService.initiate.mockResolvedValue({})
    render(<PayNowPanel order={order({ paymentMethod: 'pickup', paymentStatus: 'unpaid' })} defaultPhone="0712345678" />)
    fireEvent.click(screen.getByRole('button', { name: /pay now with m-pesa/i }))
    fireEvent.click(screen.getByRole('button', { name: /send m-pesa prompt/i }))
    await waitFor(() => expect(paymentService.initiate).toHaveBeenCalled())
    expect(paymentService.changeMethod).toHaveBeenCalledWith('o1', 'mpesa', null)
  })

  it('shows the server message when the prompt cannot be sent', async () => {
    paymentService.initiate.mockRejectedValue({ response: { data: { message: 'M-Pesa is not configured.' } } })
    render(<PayNowPanel order={order()} defaultPhone="0712345678" />)
    fireEvent.click(screen.getByRole('button', { name: /pay with m-pesa/i }))
    fireEvent.click(screen.getByRole('button', { name: /send m-pesa prompt/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('M-Pesa is not configured.')
  })
})
