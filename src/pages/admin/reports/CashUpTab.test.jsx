import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CashUpTab from './CashUpTab'

const base = {
  totalIn: 3500,
  byMethod: { mpesaAutomatic: { count: 2, amount: 2000 }, mpesaManual: { count: 1, amount: 500 }, cash: { count: 1, amount: 1000 } },
  cashByCollector: [], drivers: [], exceptions: {}, totals: { cashOutstanding: 0, needsAttention: 0 },
}
const show = (data) => render(<MemoryRouter><CashUpTab data={{ ...base, ...data }} /></MemoryRouter>)

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
