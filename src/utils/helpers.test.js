import { describe, it, expect } from 'vitest'
import {
  formatKES,
  getPriceRange,
  getStockStatus,
  normalizeKenyanPhone,
  isValidKenyanPhone,
  getCartUnitPrice,
  truncate,
  getInitials,
} from './helpers'

describe('formatKES', () => {
  it('formats a number with KES prefix and grouping', () => {
    expect(formatKES(2385)).toBe('KES 2,385')
    expect(formatKES(1460500)).toBe('KES 1,460,500')
  })

  it('treats zero as a real price, not a missing one', () => {
    expect(formatKES(0)).toBe('KES 0')
  })

  it('returns "Quote only" for null/undefined', () => {
    expect(formatKES(null)).toBe('Quote only')
    expect(formatKES(undefined)).toBe('Quote only')
  })
})

describe('getPriceRange', () => {
  const product = (packaging) => ({ varieties: [{ packaging }] })

  it('returns a min–max range across packaging', () => {
    expect(getPriceRange(product([
      { priceKES: 2385 }, { priceKES: 1460 },
    ]))).toBe('KES 1,460 – KES 2,385')
  })

  it('collapses to a single price when min equals max', () => {
    expect(getPriceRange(product([{ priceKES: 500 }, { priceKES: 500 }]))).toBe('KES 500')
  })

  it('ignores quote-only packaging', () => {
    expect(getPriceRange(product([
      { priceKES: 900 }, { priceKES: 100, quoteOnly: true },
    ]))).toBe('KES 900')
  })

  it('returns "Quote only" when nothing is priced', () => {
    expect(getPriceRange(product([{ quoteOnly: true, priceKES: 100 }]))).toBe('Quote only')
    expect(getPriceRange({ varieties: [] })).toBe('Quote only')
    expect(getPriceRange({})).toBe('Quote only')
  })
})

describe('getStockStatus', () => {
  it('is out at zero or missing stock', () => {
    expect(getStockStatus(0, 10)).toBe('out')
    expect(getStockStatus(null, 10)).toBe('out')
    expect(getStockStatus(undefined, 10)).toBe('out')
  })

  it('is low at or below the threshold', () => {
    expect(getStockStatus(1, 10)).toBe('low')
    expect(getStockStatus(10, 10)).toBe('low')
  })

  it('is in above the threshold', () => {
    expect(getStockStatus(11, 10)).toBe('in')
  })
})

describe('normalizeKenyanPhone', () => {
  it('strips spaces, dashes and parentheses', () => {
    expect(normalizeKenyanPhone('0712 345-678')).toBe('0712345678')
    expect(normalizeKenyanPhone('(0712) 345 678')).toBe('0712345678')
  })

  it('handles empty input', () => {
    expect(normalizeKenyanPhone(null)).toBe('')
    expect(normalizeKenyanPhone(undefined)).toBe('')
  })
})

describe('isValidKenyanPhone', () => {
  it('accepts 07xx / 01xx and +2547xx formats, spaced or not', () => {
    expect(isValidKenyanPhone('0712345678')).toBe(true)
    expect(isValidKenyanPhone('0712 345 678')).toBe(true)
    expect(isValidKenyanPhone('0110000000')).toBe(true)
    expect(isValidKenyanPhone('+254712345678')).toBe(true)
  })

  it('rejects wrong prefixes, lengths and countries', () => {
    expect(isValidKenyanPhone('0812345678')).toBe(false)
    expect(isValidKenyanPhone('712345678')).toBe(false)
    expect(isValidKenyanPhone('071234567')).toBe(false)
    expect(isValidKenyanPhone('+255712345678')).toBe(false)
    expect(isValidKenyanPhone('')).toBe(false)
  })
})

describe('getCartUnitPrice', () => {
  const tiers = [
    { minQty: 10, priceKES: 90 },
    { minQty: 50, priceKES: 80 },
  ]

  it('uses the base price when there are no tiers', () => {
    expect(getCartUnitPrice({ priceKES: 100, quantity: 99 })).toBe(100)
    expect(getCartUnitPrice({ priceKES: 100, quantity: 99, pricingTiers: [] })).toBe(100)
  })

  it('uses the base price below the first tier', () => {
    expect(getCartUnitPrice({ priceKES: 100, quantity: 9, pricingTiers: tiers })).toBe(100)
  })

  it('applies the highest tier the quantity qualifies for', () => {
    expect(getCartUnitPrice({ priceKES: 100, quantity: 10, pricingTiers: tiers })).toBe(90)
    expect(getCartUnitPrice({ priceKES: 100, quantity: 49, pricingTiers: tiers })).toBe(90)
    expect(getCartUnitPrice({ priceKES: 100, quantity: 50, pricingTiers: tiers })).toBe(80)
  })

  it('is order-independent in the tier list', () => {
    const reversed = [...tiers].reverse()
    expect(getCartUnitPrice({ priceKES: 100, quantity: 50, pricingTiers: reversed })).toBe(80)
    expect(getCartUnitPrice({ priceKES: 100, quantity: 10, pricingTiers: reversed })).toBe(90)
  })
})

describe('truncate', () => {
  it('leaves short strings alone and appends … past the limit', () => {
    expect(truncate('short', 10)).toBe('short')
    expect(truncate('abcdefghijk', 5)).toBe('abcde…')
    expect(truncate(null)).toBe('')
  })
})

describe('getInitials', () => {
  it('builds up to two uppercase initials', () => {
    expect(getInitials('John Doe')).toBe('JD')
    expect(getInitials('Single')).toBe('S')
    expect(getInitials('Anna Mary Smith')).toBe('AM')
    expect(getInitials()).toBe('')
  })
})
