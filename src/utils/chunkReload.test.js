import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isChunkLoadError, reloadForNewVersion } from './chunkReload'

describe('chunkReload', () => {
  let reload

  beforeEach(() => {
    sessionStorage.clear()
    reload = vi.fn()
    Object.defineProperty(window, 'location', { value: { ...window.location, reload }, writable: true })
  })

  it('recognises the stale-chunk error messages from Chrome, Safari and Firefox', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: https://x/assets/A.js'))).toBe(true)
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError(new Error('error loading dynamically imported module: https://x/assets/A.js'))).toBe(true)
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false)
  })

  it('reloads on the first failure', () => {
    expect(reloadForNewVersion()).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload again straight away (loop guard)', () => {
    reloadForNewVersion()
    expect(reloadForNewVersion()).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads again for a later deploy in the same tab', () => {
    sessionStorage.setItem('chunk_reload_at', String(Date.now() - 5 * 60 * 1000))
    expect(reloadForNewVersion()).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
