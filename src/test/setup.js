import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Always unmount between tests — leaked trees are the single most common cause
// of confusing cross-test failures in RTL suites.
afterEach(() => {
  cleanup()
})

// jsdom implements neither of these; components that call them (gallery
// scroll-into-view, matchMedia-driven layout) would otherwise throw.
// (Skipped for the few tests that opt into `// @vitest-environment node`, which have no window.)
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn()
  }

  if (!window.scrollTo) {
    window.scrollTo = vi.fn()
  }
}
