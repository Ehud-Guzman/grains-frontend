import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import OrderTotals from './OrderTotals'

const base = { subtotal: 1234.55, deliveryFee: 0, vatEnabled: true, vatRate: 16, vatAmount: 197.53, couponDiscount: 0 }

describe('OrderTotals', () => {
  it('shows the few cents the total was rounded up by, so the lines add up to the total', () => {
    render(<OrderTotals order={{ ...base, roundingAdjustment: 0.92 }} />)
    const totals = within(screen.getByTestId('order-totals'))
    expect(totals.getByText('Rounding')).toBeInTheDocument()
    expect(totals.getByText('+KES 0.92')).toBeInTheDocument()
  })

  it('shows nothing about rounding when there was none (and for orders from before whole-shilling totals)', () => {
    const { rerender } = render(<OrderTotals order={{ ...base, roundingAdjustment: 0 }} />)
    expect(screen.queryByText('Rounding')).not.toBeInTheDocument()
    rerender(<OrderTotals order={base} />)
    expect(screen.queryByText('Rounding')).not.toBeInTheDocument()
  })
})
