import { describe, it, expect, vi, afterEach } from 'vitest'
import { safeStorage, readStoredArray } from './safeStorage'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

// Safari with "Block All Cookies" and some in-app browsers throw on ANY storage access.
const breakStorage = () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError') })
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError') })
}

describe('safeStorage', () => {
  it('reads, writes and removes normally', () => {
    expect(safeStorage.set('k', 'v')).toBe(true)
    expect(safeStorage.get('k')).toBe('v')
    safeStorage.remove('k')
    expect(safeStorage.get('k')).toBeNull()
  })

  it('never throws when storage is unavailable', () => {
    breakStorage()
    expect(safeStorage.get('k')).toBeNull()
    expect(safeStorage.set('k', 'v')).toBe(false)
    expect(() => safeStorage.remove('k')).not.toThrow()
  })
})

describe('readStoredArray', () => {
  it('returns the stored entries', () => {
    localStorage.setItem('list', JSON.stringify([{ a: 1 }, { a: 2 }]))
    expect(readStoredArray('list')).toEqual([{ a: 1 }, { a: 2 }])
  })

  it('returns [] when nothing is stored or storage is unavailable', () => {
    expect(readStoredArray('missing')).toEqual([])
    breakStorage()
    expect(readStoredArray('list')).toEqual([])
  })

  it('treats anything that is not an array as damaged: returns [] and drops it', () => {
    for (const bad of ['null', '42', '"text"', '{"a":1}', '{not json']) {
      localStorage.setItem('list', bad)
      expect(readStoredArray('list')).toEqual([])
      expect(localStorage.getItem('list')).toBeNull()
    }
  })

  it('filters out entries the caller considers invalid', () => {
    localStorage.setItem('list', JSON.stringify([{ id: 'a' }, null, 7, { id: 'b' }]))
    expect(readStoredArray('list', (e) => e && typeof e.id === 'string')).toEqual([{ id: 'a' }, { id: 'b' }])
  })
})
