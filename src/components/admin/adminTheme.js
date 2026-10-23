import { useLayoutEffect, useSyncExternalStore } from 'react'
import { safeStorage } from '../../utils/safeStorage'

// The admin's colour theme: 'light', 'dark', or 'system' (follow the device).
//
// The choice is remembered per browser. It is a small external store rather than React context
// so the sidebar switch, the command palette and the charts all read one source of truth
// without a provider, and a change in another tab arrives through the `storage` event.
//
// Default is 'light': the panel was designed and checked in light, so nobody is switched to dark
// by their operating system without choosing it. "Auto" is one tap away.

const KEY = 'admin.theme'
export const THEME_PREFERENCES = ['light', 'dark', 'system']
const DEFAULT = 'light'

// When browser storage is blocked the choice still holds for this page load.
let memory = DEFAULT
const listeners = new Set()
const notify = () => listeners.forEach(fn => fn())

// Set while a PDF/print capture needs the page in light colours (see runInLightTheme).
let forcedLight = false

const readPreference = () => {
  if (forcedLight) return 'light'
  const stored = safeStorage.get(KEY)
  return THEME_PREFERENCES.includes(stored) ? stored : memory
}

export const setThemePreference = (next) => {
  if (!THEME_PREFERENCES.includes(next)) return
  memory = next
  safeStorage.set(KEY, next)
  notify()
}

const systemQuery = () => (typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null)

const subscribePreference = (fn) => {
  listeners.add(fn)
  const onStorage = (e) => { if (e.key === KEY || e.key === null) fn() }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(fn); window.removeEventListener('storage', onStorage) }
}

const subscribeSystem = (fn) => {
  const mq = systemQuery()
  if (!mq) return () => {}
  mq.addEventListener?.('change', fn)
  return () => mq.removeEventListener?.('change', fn)
}

export const resolveTheme = (preference, systemDark) => (
  preference === 'system' ? (systemDark ? 'dark' : 'light') : preference
)

// { preference, resolved, setPreference } — `resolved` is always 'light' or 'dark'.
export function useAdminTheme() {
  const preference = useSyncExternalStore(subscribePreference, readPreference, () => DEFAULT)
  const systemDark = useSyncExternalStore(subscribeSystem, () => Boolean(systemQuery()?.matches), () => false)
  return { preference, resolved: resolveTheme(preference, systemDark), setPreference: setThemePreference }
}

// Puts `dark` on <html> for as long as the admin is mounted. On <html> (not the admin's root
// <div>) because modals and toasts render into a portal under <body>; the class is removed on
// unmount so the storefront, login and driver pages are never affected. A layout effect, so the
// first paint already has the right colours.
export function useApplyAdminTheme() {
  const { resolved } = useAdminTheme()
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolved === 'dark')
    return () => root.classList.remove('dark')
  }, [resolved])
  return resolved
}

// Runs `fn` with the admin switched to light, then restores it. Exports that rasterise the page
// (the report PDF) would otherwise capture pale text and dark grid lines on a white sheet; the
// charts draw from literal colours, so they can only be fixed by really re-rendering in light.
// The screen flips to light for a moment; the saved preference is never touched.
export async function runInLightTheme(fn) {
  forcedLight = true
  notify()
  // Two frames: one for React to re-render with the light colours, one for the browser to paint.
  await new Promise(resolve => (typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame(() => requestAnimationFrame(resolve))
    : setTimeout(resolve, 50)))
  try { return await fn() } finally { forcedLight = false; notify() }
}

// Test hook: forget the in-memory choice between tests.
export const _resetAdminThemeForTests = () => { memory = DEFAULT; forcedLight = false; notify() }
