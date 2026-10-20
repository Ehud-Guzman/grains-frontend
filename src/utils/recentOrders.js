// Remembers the last few order REFERENCES placed on this device, so a guest who closes the
// confirmation page can still find their order on the Track page (the reference used to
// exist only on that screen). Only the reference is stored — never the phone number, which
// would be a privacy problem on a shared shop terminal; the customer types the phone to
// look the order up, exactly as before.
import { readStoredArray, safeStorage } from './safeStorage'

const KEY = 'vittorios_recent_orders'
const MAX = 5

export const getRecentOrders = () =>
  readStoredArray(KEY, (r) => r && typeof r.ref === 'string').slice(0, MAX)

export const rememberOrder = (ref) => {
  if (!ref) return
  // storage unavailable (private mode) — losing the convenience is fine; safeStorage never throws
  const next = [{ ref, at: Date.now() }, ...getRecentOrders().filter(r => r.ref !== ref)].slice(0, MAX)
  safeStorage.setJSON(KEY, next)
}

export const forgetOrders = () => { safeStorage.remove(KEY) }
