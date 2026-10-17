import { describe, it, expect } from 'vitest'
import { usualOrder } from './restock'

const NOW = new Date('2026-10-17T12:00:00Z')
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000).toISOString()
const order = (days, status = 'completed') => ({ status, createdAt: daysAgo(days), orderItems: [{ name: 'Maize', quantity: 1 }] })

describe('usualOrder', () => {
  it('is null with no completed orders', () => {
    expect(usualOrder([], NOW)).toBeNull()
    expect(usualOrder([order(2, 'pending'), order(9, 'cancelled')], NOW)).toBeNull()
  })

  it('uses the most recent completed order and ignores active ones', () => {
    const r = usualOrder([order(1, 'pending'), order(10), order(40)], NOW)
    expect(r.daysSince).toBe(10)
  })

  it('learns the typical gap and is due at 80% of it', () => {
    // orders 14 days apart: gaps 14, 14 -> threshold 11
    const early = usualOrder([order(9), order(23), order(37)], NOW)
    expect(early.intervalDays).toBe(14)
    expect(early.due).toBe(false)
    const late = usualOrder([order(12), order(26), order(40)], NOW)
    expect(late.due).toBe(true)
  })

  it('one unusually long gap does not skew the interval (median)', () => {
    const r = usualOrder([order(7), order(14), order(21), order(120)], NOW)
    expect(r.intervalDays).toBe(7)
  })

  it('falls back to three weeks when there is only one order', () => {
    expect(usualOrder([order(20)], NOW).due).toBe(false)
    expect(usualOrder([order(22)], NOW).due).toBe(true)
  })
})
