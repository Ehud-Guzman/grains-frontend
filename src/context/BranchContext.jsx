import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { branchService } from '../services/branch.service'
import { setShopBranchId } from '../services/api'

// Location-driven branch resolution for the storefront:
//   1. A manual pick (header switcher) always wins and persists.
//   2. Otherwise we geolocate silently and adopt the nearest branch that can
//      serve the customer (re-checked on every visit so movers aren't stuck).
//   3. Geolocation denied/unavailable → the backend's default branch.
// The resolved branchId is pushed into the api.js store, where the request
// interceptor scopes all public shop requests (products/promotions/settings).

const BRANCH_KEY = 'vittorios_shop_branch'
const GEO_TIMEOUT_MS = 6000

const BranchContext = createContext(null)

const readStored = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(BRANCH_KEY))
    if (stored?.branch?._id) return stored
  } catch { /* corrupted — ignore */ }
  return null
}

const persist = (state) => {
  try { localStorage.setItem(BRANCH_KEY, JSON.stringify(state)) } catch { /* quota — ignore */ }
}

export function BranchProvider({ children }) {
  // Seed synchronously from storage so the first render (and the very first
  // API calls) already carry the last-known branch instead of flashing default.
  const [state, setState] = useState(() => {
    const stored = readStored()
    if (stored) setShopBranchId(stored.branch._id)
    return stored // null → not resolved yet
  })
  const [resolving, setResolving] = useState(true)
  const resolvedOnce = useRef(false)

  const adopt = useCallback((next) => {
    setShopBranchId(next.branch._id)
    setState(next)
    persist(next)
  }, [])

  // Manual pick from the header switcher — sticky across visits
  const switchBranch = useCallback((branch) => {
    adopt({ branch, distanceKm: null, deliveryAvailable: true, source: 'manual' })
    toast.success(`Now shopping from ${branch.name}`)
  }, [adopt])

  // Revert to automatic (geo/default) resolution
  const useAutomaticBranch = useCallback(() => {
    localStorage.removeItem(BRANCH_KEY)
    setShopBranchId(null)
    setState(null)
    window.location.reload() // simplest way to re-run full resolution + refetch
  }, [])

  useEffect(() => {
    if (resolvedOnce.current) return
    resolvedOnce.current = true

    const stored = readStored()

    // A manual choice is the user's explicit word — don't geolocate over it,
    // but do confirm it's still a real, active branch (it may have been
    // deactivated since the pick was made) before trusting it for the session.
    if (stored?.source === 'manual') {
      branchService.getAll()
        .then((res) => {
          const branches = res.data?.data || []
          const stillActive = branches.some(b => b._id === stored.branch._id)
          if (stillActive) {
            setResolving(false)
          } else {
            localStorage.removeItem(BRANCH_KEY)
            setShopBranchId(null)
            toast(`${stored.branch.name} is no longer available — switching branches`, { icon: '⚠️' })
            window.location.reload() // re-run full resolution (geo/default) from a clean slate
          }
        })
        .catch(() => setResolving(false)) // can't verify right now — keep the manual pick rather than disrupt the session
      return
    }

    const fallbackToDefault = async () => {
      try {
        const res = await branchService.getAll()
        const branches = res.data?.data || []
        const def = branches.find(b => b.isDefault) || branches[0]
        if (def) adopt({ branch: def, distanceKm: null, deliveryAvailable: true, source: 'default' })
      } catch { /* backend unreachable — interceptor stays unscoped, backend uses default */ }
      setResolving(false)
    }

    if (!navigator.geolocation) { fallbackToDefault(); return }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await branchService.nearest(coords.latitude, coords.longitude)
          const { branch, distanceKm, deliveryAvailable } = res.data?.data || {}
          if (branch?._id) {
            const changed = stored && stored.branch._id !== branch._id
            adopt({ branch, distanceKm, deliveryAvailable, source: 'geo' })
            if (changed) toast(`Nearest branch: ${branch.name}`, { icon: '📍' })
          } else {
            await fallbackToDefault()
            return
          }
        } catch {
          await fallbackToDefault()
          return
        }
        setResolving(false)
      },
      () => { fallbackToDefault() }, // denied / unavailable / timeout
      { timeout: GEO_TIMEOUT_MS, maximumAge: 10 * 60 * 1000 }
    )
  }, [adopt])

  return (
    <BranchContext.Provider value={{
      branch: state?.branch || null,
      branchId: state?.branch?._id || null,
      distanceKm: state?.distanceKm ?? null,
      deliveryAvailable: state?.deliveryAvailable !== false,
      source: state?.source || null,
      resolving,
      switchBranch,
      useAutomaticBranch,
    }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const ctx = useContext(BranchContext)
  if (!ctx) throw new Error('useBranch must be used inside BranchProvider')
  return ctx
}
