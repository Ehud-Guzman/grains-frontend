// Regression test for the 2026-10 audit's storage finding: in a browser that blocks storage (Safari
// "Block All Cookies", the WhatsApp / Facebook in-app browsers) every public route used to show the
// "Something went wrong" error screen, because OnboardingProvider wrote to localStorage inside an
// effect. The whole shop was a white screen for those customers.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import App from '../App'

const deny = () => { throw new DOMException('The operation is insecure.', 'SecurityError') }
const realLS = Object.getOwnPropertyDescriptor(window, 'localStorage')
const realSS = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
const blockStorage = () => {
  Object.defineProperty(window, 'localStorage', { configurable: true, get: deny })
  Object.defineProperty(window, 'sessionStorage', { configurable: true, get: deny })
}
const restoreStorage = () => {
  if (realLS) Object.defineProperty(window, 'localStorage', realLS)
  if (realSS) Object.defineProperty(window, 'sessionStorage', realSS)
}

beforeEach(() => {
  // The app talks to a backend that is not there; those failures are expected noise here.
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => { cleanup(); restoreStorage() })

const ROUTES = ['/', '/shop', '/cart', '/track', '/login']
const crashed = () => !!screen.queryByText('Something went wrong')

// Give the providers' effects and the lazy route chunks time to run; a crash shows up in that window.
const settle = () => new Promise((resolve) => setTimeout(resolve, 600))

describe('storefront with browser storage available (control)', () => {
  for (const route of ROUTES) {
    test(`${route} renders without the error screen`, async () => {
      window.history.pushState({}, '', route)
      render(<App />)
      await settle()
      expect(crashed()).toBe(false)
    })
  }
})

describe('storefront with browser storage BLOCKED', () => {
  for (const route of ROUTES) {
    test(`${route} survives`, async () => {
      blockStorage()
      window.history.pushState({}, '', route)
      render(<App />)
      await settle()
      expect(crashed()).toBe(false)
      // And the page actually rendered something (not an empty root).
      await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(50))
    })
  }
})
