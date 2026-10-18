// localStorage that never throws.
//
// Reading or writing browser storage can throw - Safari with "Block All Cookies", some in-app
// browsers (the WhatsApp / Facebook / Instagram viewers customers open our links in), a full quota,
// private-mode quirks. Code that touches localStorage directly inside a React initializer or effect
// turns that into a white screen for the whole storefront. These wrappers degrade to "nothing is
// remembered" instead, which is all the app needs: every caller already copes with an empty result.
export const safeStorage = {
  get(key) {
    try { return localStorage.getItem(key) } catch { return null }
  },
  // Returns whether the value was actually stored.
  set(key, value) {
    try { localStorage.setItem(key, value); return true } catch { return false }
  },
  remove(key) {
    try { localStorage.removeItem(key) } catch { /* nothing to do */ }
  },
}

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
