import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { startVisiblePolling } from './visiblePolling'

const setHidden = (hidden) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('startVisiblePolling', () => {
  beforeEach(() => { vi.useFakeTimers(); setHidden(false) })
  afterEach(() => { vi.useRealTimers(); setHidden(false) })

  it('polls on the interval while the tab is visible', () => {
    const fn = vi.fn()
    const stop = startVisiblePolling(fn, 1000)
    vi.advanceTimersByTime(3000)
    expect(fn).toHaveBeenCalledTimes(3)
    stop()
  })

  it('makes no requests while the tab is hidden, then refreshes once on return', () => {
    const fn = vi.fn()
    const stop = startVisiblePolling(fn, 1000)
    setHidden(true)
    vi.advanceTimersByTime(10000)
    expect(fn).not.toHaveBeenCalled()
    setHidden(false)
    expect(fn).toHaveBeenCalledTimes(1)          // caught up immediately
    setHidden(false)
    expect(fn).toHaveBeenCalledTimes(1)          // and not again for no reason
    stop()
  })

  it('does not refresh on return if nothing was missed, and stops cleanly', () => {
    const fn = vi.fn()
    const stop = startVisiblePolling(fn, 1000)
    setHidden(true); setHidden(false)
    expect(fn).not.toHaveBeenCalled()
    stop()
    vi.advanceTimersByTime(5000)
    expect(fn).not.toHaveBeenCalled()
  })
})
