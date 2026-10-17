import { describe, it, expect } from 'vitest'
import { toWaNumber, waLink, customerStatusMessage, shopOrderMessage } from './whatsapp'

describe('toWaNumber', () => {
  it.each([
    ['0712345678', '254712345678'],
    ['0112345678', '254112345678'],
    ['+254 712 345 678', '254712345678'],
    ['254712345678', '254712345678'],
    ['712345678', '254712345678'],
  ])('%s -> %s', (input, expected) => expect(toWaNumber(input)).toBe(expected))

  it('returns empty for unusable input', () => {
    expect(toWaNumber('')).toBe('')
    expect(toWaNumber(null)).toBe('')
    expect(toWaNumber('123')).toBe('')
  })
})

describe('waLink', () => {
  it('encodes the message', () => {
    expect(waLink('0712345678', 'Hi & bye')).toBe('https://wa.me/254712345678?text=Hi%20%26%20bye')
  })
  it('is null for a bad number so no dead button renders', () => {
    expect(waLink('abc', 'x')).toBeNull()
  })
})

describe('messages', () => {
  it('words the status message for delivery vs pickup', () => {
    const base = { orderRef: 'ORD-1', total: 1200, status: 'out_for_delivery', guestId: { name: 'Jane Doe' } }
    expect(customerStatusMessage({ ...base, deliveryMethod: 'delivery' })).toMatch(/on its way/)
    expect(customerStatusMessage({ ...base, deliveryMethod: 'pickup' })).toMatch(/ready for collection/)
    expect(customerStatusMessage({ ...base, deliveryMethod: 'pickup' })).toMatch(/Hello Jane/)
  })
  it('includes the reference in the customer message to the shop', () => {
    expect(shopOrderMessage({ ref: 'ORD-9', total: 500 })).toMatch(/ORD-9/)
  })
})
