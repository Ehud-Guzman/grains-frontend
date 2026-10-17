import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import RunningOutCard, { daysLabel } from './RunningOutCard'

vi.mock('../../../services/admin/stock.service', () => ({
  adminStockService: { getForecast: vi.fn() },
}))
import { adminStockService } from '../../../services/admin/stock.service'

const row = (over) => ({ productId: 'p', productName: 'Maize', varietyName: 'Yellow', packagingSize: '50kg', stock: 6, perDay: 2, daysLeft: 3, windowDays: 30, severity: 'critical', ...over })

describe('RunningOutCard', () => {
  it('words the days left', () => {
    expect(daysLabel(0)).toBe('out now')
    expect(daysLabel(1)).toBe('~1 day left')
    expect(daysLabel(5)).toBe('~5 days left')
  })

  it('lists items that will run out soon', async () => {
    adminStockService.getForecast.mockResolvedValue({ data: { data: [row({}), row({ productId: 'q', productName: 'Beans', severity: 'ok', daysLeft: 60 })] } })
    render(<RunningOutCard />)
    expect(await screen.findByText(/Maize · Yellow 50kg/)).toBeInTheDocument()
    expect(screen.queryByText(/Beans/)).not.toBeInTheDocument() // plenty of stock, not worth a card
  })

  it('renders nothing when everything is comfortable or the request fails', async () => {
    adminStockService.getForecast.mockResolvedValue({ data: { data: [row({ severity: 'ok', daysLeft: 50 })] } })
    const { container, rerender } = render(<RunningOutCard />)
    await Promise.resolve()
    expect(container.querySelector('[data-testid="running-out"]')).toBeNull()
    adminStockService.getForecast.mockRejectedValue(new Error('x'))
    rerender(<RunningOutCard key="again" />)
    await Promise.resolve()
    expect(container.querySelector('[data-testid="running-out"]')).toBeNull()
  })
})
