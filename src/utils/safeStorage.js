// Browser storage that never throws.
//
// Reading or writing localStorage/sessionStorage can throw - Safari with "Block All Cookies", some
// in-app browsers (the WhatsApp / Facebook / Instagram viewers customers open our links in), a full
// quota, private-mode quirks. Even *touching* `window.localStorage` can throw. Code that uses it
// directly inside a React initializer or effect turns that into a white screen for the whole
// storefront (2026-10 audit: with storage blocked every public route showed "Something went wrong",
// because OnboardingProvider wrote to localStorage in an effect).
//
// These wrappers degrade to "nothing is remembered", which is all the app needs: every caller already
// copes with an empty result. ESLint (no-restricted-globals / no-restricted-properties) forbids using
// localStorage/sessionStorage anywhere else, so this stays the only door.
const makeStore = (name) => {
  const area = () => {
    try { return window[name] } catch { return null }
  }
  return {
    get(key) {
      try { return area()?.getItem(key) ?? null } catch { return null }
    },
    // Returns whether the value was actually stored.
    set(key, value) {
      try {
        const store = area()
        if (!store) return false
        store.setItem(key, value)
        return true
      } catch { return false }
    },
    remove(key) {
      try { area()?.removeItem(key) } catch { /* nothing to do */ }
    },
    // Parsed JSON, or `fallback` when the key is absent, unreadable or damaged (a damaged value is dropped).
    getJSON(key, fallback = null) {
      const raw = this.get(key)
      if (raw === null || raw === undefined || raw === '') return fallback
      try { return JSON.parse(raw) } catch {
        this.remove(key)
        return fallback
      }
    },
    setJSON(key, value) {
      try { return this.set(key, JSON.stringify(value)) } catch { return false }
    },
  }
}

export const safeStorage = makeStore('localStorage')
export const safeSession = makeStore('sessionStorage')

// Parse a JSON array from storage. Anything that is not an array of objects (corrupted data, `null`,
// a number, an old format) comes back as [] and the bad value is dropped, so a damaged entry can never
// crash the screens that map over it.
export const readStoredArray = (key, isValidEntry = (entry) => entry && typeof entry === 'object') => {
  const raw = safeStorage.get(key)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('not an array')
    return parsed.filter(isValidEntry)
  } catch {
    safeStorage.remove(key)
    return []
  }
}
