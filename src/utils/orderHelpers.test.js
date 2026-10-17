import { describe, it, expect, beforeEach } from 'vitest'
import { paymentStatusDisplay } from './orderDisplay'
import { getRecentOrders, rememberOrder, forgetOrders } from './recentOrders'
import { parseKg, pricePerKg, getFromPrice } from './helpers'

describe('paymentStatusDisplay', () => {
  it('does not call a refund or a failure "Payment pending"', () => {
    expect(paymentStatusDisplay({ paymentStatus: 'paid' }).label).toMatch(/Paid/)
    expect(paymentStatusDisplay({ paymentStatus: 'refunded', status: 'cancelled' }).label).toMatch(/Refund due/)
    expect(paymentStatusDisplay({ paymentStatus: 'failed', status: 'pending' }).label).toMatch(/failed/i)
    expect(paymentStatusDisplay({ paymentStatus: 'unpaid', status: 'cancelled' }).label).toBe('Not charged')
  })

  it('names the method for cash orders and falls back to pending for M-Pesa', () => {
    expect(paymentStatusDisplay({ paymentStatus: 'unpaid', paymentMethod: 'pickup', status: 'pending' }).label).toBe('Pay on pickup')
    expect(paymentStatusDisplay({ paymentStatus: 'unpaid', paymentMethod: 'delivery', status: 'pending' }).label).toBe('Pay on delivery')
    expect(paymentStatusDisplay({ paymentStatus: 'pending', paymentMethod: 'mpesa', status: 'pending' }).label).toBe('Payment pending')
  })
})

describe('recent orders (references only)', () => {
  beforeEach(() => forgetOrders())

  it('remembers the latest five references, newest first, without duplicates', () => {
    for (const r of ['A', 'B', 'C', 'D', 'E', 'F', 'C']) rememberOrder(r)
    expect(getRecentOrders().map(r => r.ref)).toEqual(['C', 'F', 'E', 'D', 'B'])
  })

  it('never stores a phone number', () => {
    rememberOrder('ORD-1')
    const stored = JSON.parse(localStorage.getItem('vittorios_recent_orders'))
    expect(Object.keys(stored[0]).sort()).toEqual(['at', 'ref'])
  })

  it('survives corrupted storage', () => {
    localStorage.setItem('vittorios_recent_orders', '{nope')
    expect(getRecentOrders()).toEqual([])
  })
})

describe('price per kilo', () => {
  it('parses plain weights only', () => {
    expect(parseKg('50kg')).toBe(50)
    expect(parseKg(' 12.5 KG ')).toBe(12.5)
    expect(parseKg('Bulk')).toBeNull()
  })

  it('computes per-kg price and skips quote-only packs', () => {
    expect(pricePerKg({ size: '100kg', priceKES: 1900 })).toBe(19)
    expect(pricePerKg({ size: 'Bulk', priceKES: 100 })).toBeNull()
    expect(pricePerKg({ size: '50kg', priceKES: 100, quoteOnly: true })).toBeNull()
  })

  it('card price line is the cheapest per-kg when every pack is a weight', () => {
    const product = { varieties: [{ packaging: [{ size: '1kg', priceKES: 49 }, { size: '100kg', priceKES: 1900 }] }] }
    expect(getFromPrice(product)).toBe('From KES 19 / kg')
  })

  it('falls back to the lowest pack price, or "Quote only"', () => {
    expect(getFromPrice({ varieties: [{ packaging: [{ size: 'Bag', priceKES: 800 }, { size: '50kg', priceKES: 2000 }] }] })).toBe('From KES 800')
    expect(getFromPrice({ varieties: [{ packaging: [{ size: 'Bulk', quoteOnly: true }] }] })).toBe('Quote only')
  })
})
