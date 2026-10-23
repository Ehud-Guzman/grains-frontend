import { describe, it, expect } from 'vitest'
import { money, moneyCompact, paymentLabel, hourLabel, percentChange, humanise } from './reportFormat'
import { monthRange, periodParams, periodLabel, eatToday, isRolling, spanDays } from './reportPeriods'

describe('money', () => {
  it('shows whole shillings, however the API rounded', () => {
    expect(money(88408499.4)).toBe('KES 88,408,499')
    expect(money(2754330.72)).toBe('KES 2,754,331')
    expect(money(19378799.2)).toBe('KES 19,378,799')
    expect(money(0)).toBe('KES 0')
  })
  it('shows a dash, not "Quote only" or NaN, for a missing figure', () => {
    expect(money(null)).toBe('—')
    expect(money(undefined)).toBe('—')
    expect(money('abc')).toBe('—')
  })
})

describe('moneyCompact (chart axis)', () => {
  it('reads K and M, never "12000K"', () => {
    expect(moneyCompact(450)).toBe('450')
    expect(moneyCompact(1500)).toBe('1.5K')
    expect(moneyCompact(12000)).toBe('12K')
    expect(moneyCompact(3000000)).toBe('3M')
    expect(moneyCompact(12000000)).toBe('12M')
    expect(moneyCompact(4500000)).toBe('4.5M')
    expect(moneyCompact(0)).toBe('0')
  })
})

describe('paymentLabel', () => {
  it('names the methods the way the shop does', () => {
    expect(paymentLabel('mpesa')).toBe('M-Pesa')
    expect(paymentLabel('delivery')).toBe('Cash on delivery')
    expect(paymentLabel('pickup')).toBe('Pay on pickup')
  })
  it('falls back to a readable version of an unknown id', () => {
    expect(paymentLabel('bank_transfer')).toBe('Bank transfer')
    expect(paymentLabel(null)).toBe('—')
  })
})

describe('hourLabel / humanise', () => {
  it('uses a 12-hour clock', () => {
    expect([0, 1, 9, 12, 13, 23].map(hourLabel)).toEqual(['12 AM', '1 AM', '9 AM', '12 PM', '1 PM', '11 PM'])
  })
  it('turns status ids into words', () => {
    expect(humanise('out_for_delivery')).toBe('Out for delivery')
    expect(humanise(undefined)).toBe('—')
  })
})

describe('percentChange', () => {
  it('rounds symmetrically, so a fall and a rise of the same size read the same', () => {
    expect(percentChange(5000, 8000)).toBe(-38)    // -37.5
    expect(percentChange(11000, 8000)).toBe(38)    // +37.5
    expect(percentChange(100, 100)).toBe(0)
  })
  it('says nothing when there is nothing to compare with', () => {
    expect(percentChange(100, 0)).toBeNull()
    expect(percentChange(100, undefined)).toBeNull()
    expect(percentChange(undefined, 100)).toBeNull()
  })
})

describe('eatToday', () => {
  it('is the Nairobi date, not the device date', () => {
    expect(eatToday(new Date('2026-10-23T22:30:00Z'))).toBe('2026-10-24')   // already tomorrow in Nairobi
    expect(eatToday(new Date('2026-10-23T20:59:00Z'))).toBe('2026-10-23')
  })
})

describe('monthRange', () => {
  it('this month ends today, last month is the whole of it', () => {
    expect(monthRange('2026-10-23', 0)).toEqual({ from: '2026-10-01', to: '2026-10-23' })
    expect(monthRange('2026-10-23', -1)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
  })
  it('crosses a year boundary and knows February', () => {
    expect(monthRange('2026-01-05', -1)).toEqual({ from: '2025-12-01', to: '2025-12-31' })
    expect(monthRange('2028-03-10', -1)).toEqual({ from: '2028-02-01', to: '2028-02-29' })   // leap year
    expect(monthRange('2027-03-10', -1)).toEqual({ from: '2027-02-01', to: '2027-02-28' })
  })
})

describe('periodParams', () => {
  const today = '2026-10-23'
  it('sends a rolling window as a period name', () => {
    expect(periodParams('month', {}, today)).toEqual({ period: 'month' })
    expect(periodParams('today', {}, today)).toEqual({ period: 'today' })
  })
  it('sends calendar periods as explicit dates', () => {
    expect(periodParams('this-month', {}, today)).toEqual({ from: '2026-10-01', to: '2026-10-23' })
    expect(periodParams('last-month', {}, today)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
  })
  it('sends a custom range as given, and is not ready for a half-filled or backwards one', () => {
    expect(periodParams('custom', { from: '2026-10-01', to: '2026-10-15' }, today)).toEqual({ from: '2026-10-01', to: '2026-10-15' })
    expect(periodParams('custom', { from: '2026-10-01', to: '' }, today)).toBeNull()
    expect(periodParams('custom', { from: '', to: '' }, today)).toBeNull()
    expect(periodParams('custom', { from: '2026-10-15', to: '2026-10-01' }, today)).toBeNull()
    expect(periodParams('custom', { from: '2026-10-05', to: '2026-10-05' }, today)).toEqual({ from: '2026-10-05', to: '2026-10-05' })
  })
  it('tells rolling windows from calendar ones', () => {
    expect(['today', 'week', 'month', 'year'].every(isRolling)).toBe(true)
    expect(['this-month', 'last-month', 'custom'].some(isRolling)).toBe(false)
  })
})

describe('periodLabel / spanDays', () => {
  it('names a calendar month with its dates', () => {
    expect(periodLabel('last-month', {}, '2026-10-23')).toBe('Last month (1 Sept 2026 – 30 Sept 2026)')
    expect(periodLabel('month')).toBe('30 Days')
    expect(periodLabel('custom', { from: '2026-10-01', to: '2026-10-15' })).toBe('1 Oct 2026 – 15 Oct 2026')
    expect(periodLabel('custom', {})).toBe('Custom range')
  })
  it('counts the days in a returned period', () => {
    expect(spanDays({ start: '2026-10-01T00:00:00Z', end: '2026-10-31T00:00:00Z' })).toBe(30)
    expect(spanDays({ start: '2026-10-22T21:00:00.000Z', end: '2026-10-23T20:59:59.999Z' })).toBe(1)
    expect(spanDays(null)).toBeNull()
  })
})
