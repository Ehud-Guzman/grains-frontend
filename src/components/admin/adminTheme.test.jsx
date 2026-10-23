import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, renderHook } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  useAdminTheme, useApplyAdminTheme, setThemePreference, runInLightTheme, resolveTheme, _resetAdminThemeForTests,
} from './adminTheme'
import ThemeSwitch from './ThemeSwitch'

// jsdom has no matchMedia: a small fake whose "device is dark" flag a test can flip.
const fakeSystem = (dark) => {
  const listeners = new Set()
  const mq = {
    matches: dark,
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
  }
  window.matchMedia = vi.fn(() => mq)
  return { flip: (next) => { mq.matches = next; listeners.forEach(fn => fn()) } }
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  _resetAdminThemeForTests()
  fakeSystem(false)
})
afterEach(() => { vi.restoreAllMocks(); delete window.matchMedia })

describe('resolveTheme', () => {
  it('follows the device only for "system"', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})

describe('useAdminTheme', () => {
  it('starts light, even on a dark device, until a choice is made', () => {
    fakeSystem(true)
    const { result } = renderHook(() => useAdminTheme())
    expect(result.current).toMatchObject({ preference: 'light', resolved: 'light' })
  })

  it('remembers the choice in storage, and ignores nonsense', () => {
    const { result } = renderHook(() => useAdminTheme())
    act(() => setThemePreference('dark'))
    expect(result.current).toMatchObject({ preference: 'dark', resolved: 'dark' })
    expect(localStorage.getItem('admin.theme')).toBe('dark')
    act(() => setThemePreference('purple'))
    expect(result.current.preference).toBe('dark')
  })

  it('"system" tracks the device live', () => {
    const sys = fakeSystem(false)
    const { result } = renderHook(() => useAdminTheme())
    act(() => setThemePreference('system'))
    expect(result.current.resolved).toBe('light')
    act(() => sys.flip(true))
    expect(result.current.resolved).toBe('dark')
    act(() => sys.flip(false))
    expect(result.current.resolved).toBe('light')
  })

  it('treats a damaged stored value as the default', () => {
    localStorage.setItem('admin.theme', '{"oops"')
    const { result } = renderHook(() => useAdminTheme())
    expect(result.current.preference).toBe('light')
  })

  it('still works for this page load when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    const { result } = renderHook(() => useAdminTheme())
    act(() => setThemePreference('dark'))
    expect(result.current.resolved).toBe('dark')
  })

  it('picks up a change made in another tab', () => {
    const { result } = renderHook(() => useAdminTheme())
    act(() => {
      localStorage.setItem('admin.theme', 'dark')
      window.dispatchEvent(new StorageEvent('storage', { key: 'admin.theme', newValue: 'dark' }))
    })
    expect(result.current.preference).toBe('dark')
  })
})

describe('useApplyAdminTheme', () => {
  const Probe = () => { useApplyAdminTheme(); return null }

  it('puts the dark class on <html> while mounted, and removes it on unmount', () => {
    setThemePreference('dark')
    const { unmount } = render(<Probe />)
    expect(document.documentElement).toHaveClass('dark')
    unmount()
    expect(document.documentElement).not.toHaveClass('dark')   // the storefront must never inherit it
  })

  it('follows the choice as it changes', () => {
    render(<Probe />)
    expect(document.documentElement).not.toHaveClass('dark')
    act(() => setThemePreference('dark'))
    expect(document.documentElement).toHaveClass('dark')
    act(() => setThemePreference('light'))
    expect(document.documentElement).not.toHaveClass('dark')
  })
})

describe('runInLightTheme', () => {
  it('shows light while the work runs, then restores the saved choice untouched', async () => {
    setThemePreference('dark')
    render(<ThemeProbe />)
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
    let during
    await runInLightTheme(async () => { during = document.querySelector('[data-testid=resolved]').textContent })
    expect(during).toBe('light')
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
    expect(localStorage.getItem('admin.theme')).toBe('dark')
  })

  it('restores the theme even when the work throws', async () => {
    setThemePreference('dark')
    render(<ThemeProbe />)
    await expect(runInLightTheme(async () => { throw new Error('capture failed') })).rejects.toThrow('capture failed')
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
  })
})

function ThemeProbe() {
  const { resolved } = useAdminTheme()
  return <p data-testid="resolved">{resolved}</p>
}

describe('ThemeSwitch', () => {
  it('offers Light, Dark and Auto, and marks the current one', async () => {
    const user = userEvent.setup()
    render(<ThemeSwitch collapsed={false} />)
    const group = screen.getByRole('group', { name: 'Colour theme' })
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /light/i })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: /dark/i }))
    expect(screen.getByRole('button', { name: /dark/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /light/i })).toHaveAttribute('aria-pressed', 'false')
    expect(localStorage.getItem('admin.theme')).toBe('dark')
    await user.click(screen.getByRole('button', { name: /auto/i }))
    expect(localStorage.getItem('admin.theme')).toBe('system')
  })

  it('collapses to one button that flips between light and dark', async () => {
    const user = userEvent.setup()
    render(<ThemeSwitch collapsed />)
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(localStorage.getItem('admin.theme')).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument()
  })
})
