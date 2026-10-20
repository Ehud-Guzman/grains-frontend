import { describe, it, expect, vi, afterEach } from 'vitest'
import { safeStorage, safeSession, readStoredArray } from './safeStorage'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

// Safari with "Block All Cookies" and some in-app browsers throw on ANY storage access.
const breakStorage = () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError') })
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError') })
}

// The strictest case: even reading `window.localStorage` itself throws (Chrome with site data blocked).
const blockStorageGetters = () => {
  const real = {
    localStorage: Object.getOwnPropertyDescriptor(window, 'localStorage'),
    sessionStorage: Object.getOwnPropertyDescriptor(window, 'sessionStorage'),
  }
  const deny = () => { throw new DOMException('The operation is insecure.', 'SecurityError') }
  Object.defineProperty(window, 'localStorage', { configurable: true, get: deny })
  Object.defineProperty(window, 'sessionStorage', { configurable: true, get: deny })
  return () => {
    if (real.localStorage) Object.defineProperty(window, 'localStorage', real.localStorage)
    if (real.sessionStorage) Object.defineProperty(window, 'sessionStorage', real.sessionStorage)
  }
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

  it('never throws when merely touching window.localStorage throws', () => {
    const restore = blockStorageGetters()
    try {
      expect(safeStorage.get('k')).toBeNull()
      expect(safeStorage.set('k', 'v')).toBe(false)
      expect(() => safeStorage.remove('k')).not.toThrow()
      expect(safeStorage.getJSON('k', { fallback: true })).toEqual({ fallback: true })
      expect(safeStorage.setJSON('k', { a: 1 })).toBe(false)
      expect(safeSession.get('k')).toBeNull()
      expect(safeSession.set('k', 'v')).toBe(false)
    } finally {
      restore()
    }
  })
})

describe('safeStorage JSON helpers', () => {
  it('round-trips a value', () => {
    expect(safeStorage.setJSON('obj', { a: 1, b: [2, 3] })).toBe(true)
    expect(safeStorage.getJSON('obj')).toEqual({ a: 1, b: [2, 3] })
  })

  it('returns the fallback for a missing key', () => {
    expect(safeStorage.getJSON('missing')).toBeNull()
    expect(safeStorage.getJSON('missing', {})).toEqual({})
  })

  it('returns the fallback for damaged JSON and drops the bad value', () => {
    localStorage.setItem('bad', '{not json')
    expect(safeStorage.getJSON('bad', 'fallback')).toBe('fallback')
    expect(localStorage.getItem('bad')).toBeNull()
  })

  it('does not throw on a value JSON cannot serialise', () => {
    const circular = {}
    circular.self = circular
    expect(safeStorage.setJSON('circ', circular)).toBe(false)
  })
})

describe('safeSession', () => {
  it('uses sessionStorage, not localStorage', () => {
    expect(safeSession.set('s', '1')).toBe(true)
    expect(sessionStorage.getItem('s')).toBe('1')
    expect(localStorage.getItem('s')).toBeNull()
    safeSession.remove('s')
    expect(safeSession.get('s')).toBeNull()
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
