import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RefundPanel, CreditNotePanel } from './OrderMoneyPanels'

const m = vi.hoisted(() => ({
  refund: vi.fn(), creditNote: vi.fn(),
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}))
vi.mock('../../../services/admin/payment.service', () => ({ adminPaymentService: { recordRefundSent: m.refund } }))
vi.mock('../../../services/admin/order.service', () => ({ adminOrderService: { recordCreditNote: m.creditNote } }))
vi.mock('react-hot-toast', () => ({ default: m.toast }))

const owedOrder = (over = {}, pay = {}) => ({
  _id: 'o1', status: 'cancelled', paymentStatus: 'refunded', refundSettledAt: null,
  paymentId: { amount: 4201, receivedAmount: 4201, refundedAt: '2026-10-20T08:00:00Z', refundSentAt: null, ...pay }, ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  m.refund.mockResolvedValue({})
  m.creditNote.mockResolvedValue({})
})

describe('RefundPanel', () => {
  it('shows nothing for an order that is not refunded, or when the payment was not loaded', () => {
    const { container, rerender } = render(<RefundPanel order={{ ...owedOrder(), paymentStatus: 'paid' }} canRecord />)
    expect(container).toBeEmptyDOMElement()
    rerender(<RefundPanel order={{ ...owedOrder(), paymentId: 'abc123' }} canRecord />)
    expect(container).toBeEmptyDOMElement()
  })

  it('says how much is owed (what was received, not what was asked) and since when', () => {
    render(<RefundPanel order={owedOrder({}, { amount: 4200, receivedAmount: 4500 })} canRecord />)
    expect(screen.getByText(/refund owed: kes 4,500/i)).toBeInTheDocument()
    expect(screen.getByText(/was cancelled after the customer paid/i)).toBeInTheDocument()
  })

  it('tells people who cannot send money what is owed, without a button', () => {
    render(<RefundPanel order={owedOrder()} canRecord={false} />)
    expect(screen.getByText(/refund owed/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /record refund sent/i })).not.toBeInTheDocument()
  })

  it('records an M-Pesa refund with its receipt, then asks the page to reload', async () => {
    const onDone = vi.fn()
    const user = userEvent.setup()
    render(<RefundPanel order={owedOrder()} canRecord onDone={onDone} />)
    await user.click(screen.getByRole('button', { name: /record refund sent/i }))
    await user.type(screen.getByPlaceholderText('e.g. QDK14KSHD7'), 'qrf0000001')
    expect(screen.getByPlaceholderText('e.g. QDK14KSHD7')).toHaveValue('QRF0000001')
    await user.click(screen.getAllByRole('button', { name: /record refund sent/i }).at(-1))
    await waitFor(() => expect(m.refund).toHaveBeenCalledWith('o1', { method: 'mpesa', reference: 'QRF0000001', note: '' }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(m.toast.success).toHaveBeenCalled()
  })

  it('will not send an M-Pesa refund without a proper receipt', async () => {
    const user = userEvent.setup()
    render(<RefundPanel order={owedOrder()} canRecord />)
    await user.click(screen.getByRole('button', { name: /record refund sent/i }))
    await user.type(screen.getByPlaceholderText('e.g. QDK14KSHD7'), 'ABC')
    await user.click(screen.getAllByRole('button', { name: /record refund sent/i }).at(-1))
    expect(m.refund).not.toHaveBeenCalled()
    expect(m.toast.error).toHaveBeenCalledWith(expect.stringMatching(/10-character/))
  })

  it('needs no receipt for cash, but a part refund needs a reason and cannot exceed what was received', async () => {
    const user = userEvent.setup()
    render(<RefundPanel order={owedOrder()} canRecord />)
    await user.click(screen.getByRole('button', { name: /record refund sent/i }))
    await user.selectOptions(screen.getByLabelText(/how was it sent/i), 'cash')
    const amount = screen.getByLabelText(/amount sent/i)
    await user.type(amount, '9000')
    await user.click(screen.getAllByRole('button', { name: /record refund sent/i }).at(-1))
    expect(m.toast.error).toHaveBeenLastCalledWith(expect.stringMatching(/between KES 1 and KES 4201/))
    await user.clear(amount); await user.type(amount, '4000')
    await user.click(screen.getAllByRole('button', { name: /record refund sent/i }).at(-1))
    expect(m.toast.error).toHaveBeenLastCalledWith(expect.stringMatching(/needs a note/))
    expect(m.refund).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText(/^note/i), 'delivery already driven')
    await user.click(screen.getAllByRole('button', { name: /record refund sent/i }).at(-1))
    await waitFor(() => expect(m.refund).toHaveBeenCalledWith('o1', { method: 'cash', reference: '', note: 'delivery already driven', amount: 4000 }))
  })

  it('shows a sent refund as done, with how, how much and the receipt, and no way to record it again', () => {
    render(<RefundPanel canRecord order={owedOrder({ refundSettledAt: '2026-10-22T10:00:00Z' }, {
      refundSentAt: '2026-10-22T10:00:00Z', refundSentAmount: 4201, refundMethod: 'mpesa', refundReference: 'QRF0000001',
    })} />)
    expect(screen.getByText('Refund sent')).toBeInTheDocument()
    expect(screen.getByText(/QRF0000001/)).toBeInTheDocument()
    expect(screen.getByText(/by M-Pesa/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the server\'s reason when it refuses', async () => {
    m.refund.mockRejectedValueOnce({ response: { data: { message: 'This refund has already been recorded as sent' } } })
    const user = userEvent.setup()
    render(<RefundPanel order={owedOrder()} canRecord />)
    await user.click(screen.getByRole('button', { name: /record refund sent/i }))
    await user.selectOptions(screen.getByLabelText(/how was it sent/i), 'cash')
    await user.click(screen.getAllByRole('button', { name: /record refund sent/i }).at(-1))
    await waitFor(() => expect(m.toast.error).toHaveBeenCalledWith('This refund has already been recorded as sent'))
  })
})

describe('CreditNotePanel', () => {
  const order = (over = {}) => ({ _id: 'o9', status: 'cancelled', etimsInvoiceNumber: 'INV-1001', etimsCreditNoteStatus: 'required', ...over })

  it('is silent unless KRA holds an invoice for an order that was cancelled', () => {
    const { container } = render(<CreditNotePanel order={order({ etimsCreditNoteStatus: 'not_required' })} canRecord />)
    expect(container).toBeEmptyDOMElement()
  })

  it('explains what to do, and lets an admin record the reference', async () => {
    const onDone = vi.fn()
    const user = userEvent.setup()
    render(<CreditNotePanel order={order()} canRecord onDone={onDone} />)
    expect(screen.getByText(/credit note must be filed with kra/i)).toBeInTheDocument()
    expect(screen.getByText('INV-1001')).toBeInTheDocument()
    const save = screen.getByRole('button', { name: /record credit note/i })
    expect(save).toBeDisabled()
    await user.type(screen.getByLabelText('Credit note reference'), 'CN-2026-0077')
    await user.click(save)
    await waitFor(() => expect(m.creditNote).toHaveBeenCalledWith('o9', 'CN-2026-0077'))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
  })

  it('shows the warning but no form to anyone who cannot record it', () => {
    render(<CreditNotePanel order={order()} canRecord={false} />)
    expect(screen.getByText(/credit note must be filed with kra/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Credit note reference')).not.toBeInTheDocument()
  })

  it('shows the recorded reference once it is done', () => {
    render(<CreditNotePanel order={order({ etimsCreditNoteStatus: 'issued', etimsCreditNoteRef: 'CN-2026-0077' })} canRecord />)
    expect(screen.getByText('CN-2026-0077')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
