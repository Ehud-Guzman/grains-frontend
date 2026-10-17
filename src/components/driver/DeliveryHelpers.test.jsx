import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CollectionBanner, NavigateLink } from './DeliveryHelpers'

describe('CollectionBanner', () => {
  it('tells the rider to collect cash on a pay-on-delivery order', () => {
    render(<CollectionBanner order={{ paymentMethod: 'delivery', paymentStatus: 'unpaid', total: 4300 }} />)
    expect(screen.getByTestId('collect-cash')).toHaveTextContent('Collect KES 4,300 cash on delivery')
  })

  it('says not to collect when the order is already paid', () => {
    render(<CollectionBanner order={{ paymentMethod: 'mpesa', paymentStatus: 'paid', total: 4300 }} />)
    expect(screen.getByTestId('collect-paid')).toHaveTextContent(/do not collect cash/i)
  })

  it('warns when an order is neither paid nor cash-on-delivery', () => {
    render(<CollectionBanner order={{ paymentMethod: 'mpesa', paymentStatus: 'pending', total: 100 }} />)
    expect(screen.getByTestId('collect-unpaid')).toBeInTheDocument()
  })
})

describe('NavigateLink', () => {
  it('uses the exact pin when the customer shared a location', () => {
    render(<NavigateLink order={{ deliveryCoordinates: { lat: -1.28, lng: 36.81 }, deliveryAddress: 'x' }} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', expect.stringContaining('destination=-1.28,36.81'))
  })

  it('falls back to searching the typed address', () => {
    render(<NavigateLink order={{ deliveryAddress: 'Moi Ave & 5th St' }} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', expect.stringContaining(encodeURIComponent('Moi Ave & 5th St')))
  })

  it('renders nothing with no address and no pin', () => {
    const { container } = render(<NavigateLink order={{}} />)
    expect(container).toBeEmptyDOMElement()
  })
})
