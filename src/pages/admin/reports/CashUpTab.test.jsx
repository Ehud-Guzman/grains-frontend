import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import CashUpTab from './CashUpTab'

const m = vi.hoisted(() => ({ resolve: vi.fn(), toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock('../../../services/admin/payment.service', () => ({ adminPaymentService: { resolveException: m.resolve } }))
vi.mock('react-hot-toast', () => ({ default: m.toast }))
beforeEach(() => { vi.clearAllMocks(); m.resolve.mockResolvedValue({}) })

const base = {
  totalIn: 3500,
  byMethod: { mpesaAutomatic: { count: 2, amount: 2000 }, mpesaManual: { count: 1, amount: 500 }, cash: { count: 1, amount: 1000 } },
  cashByCollector: [], drivers: [], exceptions: {}, totals: { cashOutstanding: 0, needsAttention: 0 },
}
const show = (data, props = {}) => render(<MemoryRouter><CashUpTab data={{ ...base, ...data }} {...props} /></MemoryRouter>)

describe('CashUpTab', () => {
  it('renders nothing, without crashing, while handed data from a different tab', () => {
    const { container } = render(<MemoryRouter><CashUpTab data={{ sales: [], period: {} }} /></MemoryRouter>)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the all-clear when nothing is outstanding', () => {
    show({})
    expect(screen.getByText(/nothing needs attention/i)).toBeInTheDocument()
  })

  it('lists drivers with what is still to confirm', () => {
    show({
      drivers: [{ driverId: 'd1', driverName: 'Dan', deliveries: 4, due: 4000, confirmed: 2500, outstanding: 1500, unconfirmedOrders: 2 }],
      totals: { cashOutstanding: 1500, needsAttention: 0 },
    })
    expect(screen.getByText('Dan')).toBeInTheDocument()
    expect(screen.queryByText(/nothing needs attention/i)).not.toBeInTheDocument()
    expect(screen.getByText(/\(2\)/)).toBeInTheDocument()
  })

  it('surfaces a late M-Pesa payment for hand reconciliation', () => {
    show({
      exceptions: { lateSuccess: [{ paymentId: 'p1', orderRef: 'ORD-9', amount: 1000, lateSuccessMeta: { mpesaTransactionId: 'QLATE00001', paidAmount: 1000 } }] },
      totals: { cashOutstanding: 0, needsAttention: 1 },
    })
    expect(screen.getByText(/late payment/i)).toBeInTheDocument()
    expect(screen.getByText(/QLATE00001/)).toBeInTheDocument()
  })
})

describe('CashUpTab: reconciliation', () => {
  const recon = { payments: 3, invoiced: 3301.15, roundedUp: 0.85, overpaid: 500, received: 3802 }

  it('explains the gap between invoiced and received, line by line', () => {
    show({ reconciliation: recon })
    const card = screen.getByText('How received matches invoiced').closest('div').parentElement
    expect(within(card).getByText('KES 3,301')).toBeInTheDocument()     // whole shillings, like every report
    expect(within(card).getByText('KES 500')).toBeInTheDocument()
    expect(within(card).getByText('KES 3,802')).toBeInTheDocument()
    expect(within(card).getByText(/surplus to hand back/i)).toBeInTheDocument()
  })

  it('stays out of the way when there were no payments, or an older API sends none', () => {
    show({ reconciliation: { ...recon, payments: 0 } })
    expect(screen.queryByText('How received matches invoiced')).not.toBeInTheDocument()
  })
})

describe('CashUpTab: refunds owed', () => {
  const refunds = {
    owed: { count: 2, amount: 3500, oldestAt: new Date(Date.now() - 10 * 86400000).toISOString(), orders: [
      { paymentId: 'p1', orderId: 'o1', orderRef: 'NAI-1', amount: 1000, refundedAt: new Date(Date.now() - 10 * 86400000).toISOString(), refundReason: 'customer changed mind' },
      { paymentId: 'p2', orderId: 'o2', orderRef: 'NAI-2', amount: 2500, refundedAt: new Date().toISOString() },
    ] },
    sent: { count: 1, amount: 400 },
  }

  it('lists what is owed back, oldest first, with links to the orders and how long each has waited', () => {
    show({ refunds, totals: { cashOutstanding: 0, needsAttention: 2 } })
    expect(screen.getByText('Refunds owed', { selector: 'div' }).parentElement).toHaveTextContent('KES 3,500')
    expect(screen.getByRole('link', { name: 'NAI-1' })).toHaveAttribute('href', '/admin/orders/o1')
    expect(screen.getByText(/owed 10 days/)).toBeInTheDocument()
    expect(screen.getByText(/customer changed mind/)).toBeInTheDocument()
    expect(screen.getByText(/Sent back in this period: KES 400 across 1 refund\./)).toBeInTheDocument()
    expect(screen.queryByText(/nothing needs attention/i)).not.toBeInTheDocument()
  })

  it('says so when nothing is owed', () => {
    show({})
    expect(screen.getByText('No refunds owed.')).toBeInTheDocument()
  })

  it('says how many more there are beyond the list', () => {
    show({ refunds: { ...refunds, owed: { ...refunds.owed, count: 7 } } })
    expect(screen.getByText(/and 5 more, oldest shown first/)).toBeInTheDocument()
  })
})

describe('CashUpTab: exceptions that can be closed', () => {
  const short = { paymentId: 'p7', orderRef: 'NAI-7', amount: 2000,
    lateSuccessMeta: { mpesaTransactionId: 'QSHORT0001', paidAmount: 1950, expected: 2000, reason: 'short_payment' } }
  const mismatch = { paymentId: 'p8', orderRef: 'NAI-8', amount: 1200, receiptMismatch: { typedReceipt: 'QTYPED0001', safaricomReceipt: 'QREAL00002' } }

  it('names a short payment as such, and says what was missing', () => {
    show({ exceptions: { lateSuccess: [short] }, totals: { cashOutstanding: 0, needsAttention: 1 } })
    expect(screen.getByText('Paid short')).toBeInTheDocument()
    expect(screen.getByText(/the order needed KES 2,000, so it was not credited/i)).toBeInTheDocument()
    expect(screen.queryByText('Late payment')).not.toBeInTheDocument()
  })

  it('shows contradicting receipts side by side', () => {
    show({ exceptions: { receiptMismatch: [mismatch] }, totals: { cashOutstanding: 0, needsAttention: 1 } })
    expect(screen.getByText('Receipts differ')).toBeInTheDocument()
    expect(screen.getByText('QTYPED0001')).toBeInTheDocument()
    expect(screen.getByText('QREAL00002')).toBeInTheDocument()
  })

  it('lets someone who may close it do so, with a note, then reloads the report', async () => {
    const onChanged = vi.fn()
    const user = userEvent.setup()
    show({ exceptions: { lateSuccess: [short] }, totals: { cashOutstanding: 0, needsAttention: 1 } }, { canClose: true, onChanged })
    await user.click(screen.getByRole('button', { name: /close/i }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(m.resolve).not.toHaveBeenCalled()                                 // a note is required
    await user.type(screen.getByLabelText('What was done'), 'Customer paid the KES 50 difference')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(m.resolve).toHaveBeenCalledWith('p7', 'Customer paid the KES 50 difference'))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })

  it('offers no way to close to someone who may not', () => {
    show({ exceptions: { lateSuccess: [short], receiptMismatch: [mismatch] }, totals: { cashOutstanding: 0, needsAttention: 2 } })
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
  })
})
