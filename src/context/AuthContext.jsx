import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { authService } from '../services/auth.service'
import { setToken, clearToken } from '../services/api'

const AuthContext = createContext(null)

const ADMIN_ROLES = ['staff', 'supervisor', 'admin', 'superadmin']
const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes in ms

export const AuthProvider = ({ children }) => {
  const [user, setUser]           = useState(null)
  const [currentBranch, setCurrentBranch] = useState(null) // { id, name, slug, location }
  const [isLoading, setIsLoading] = useState(true)
  const inactivityTimer = useRef(null)

  useEffect(() => {
    // On mount, the in-memory token is always gone (page reload clears JS heap).
    // Try to restore the session via the HttpOnly refreshToken cookie.
    // If the cookie is present and valid the server returns a fresh access token.
    const restore = async () => {
      const stored       = localStorage.getItem('user')
      const storedBranch = localStorage.getItem('currentBranch')
      if (!stored) {
        setIsLoading(false)
        return
      }
      try {
        const res = await authService.refresh()
        const { accessToken, user: freshUser } = res.data.data
        setToken(accessToken)
        const userData = freshUser || JSON.parse(stored)
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
        if (storedBranch) setCurrentBranch(JSON.parse(storedBranch))
      } catch {
        // Refresh failed (cookie expired or revoked) — clear stale local state
        clearToken()
        localStorage.removeItem('user')
        localStorage.removeItem('currentBranch')
      } finally {
        setIsLoading(false)
      }
    }
    restore()
  }, [])

  // ── ADMIN INACTIVITY TIMEOUT ──────────────────────────────────────────────
  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current)
      inactivityTimer.current = null
    }
  }, [])

  const resetInactivityTimer = useCallback(() => {
    if (!user || !ADMIN_ROLES.includes(user.role)) return
    clearInactivityTimer()
    inactivityTimer.current = setTimeout(async () => {
      // Cookie is sent automatically by the browser; no token arg needed
      try { await authService.logout() } catch {}
      clearToken()
      localStorage.removeItem('user')
      localStorage.removeItem('currentBranch')
      setUser(null)
      setCurrentBranch(null)
      window.location.href = '/login?reason=inactivity'
    }, INACTIVITY_TIMEOUT)
  }, [user, clearInactivityTimer])

  useEffect(() => {
    if (!user || !ADMIN_ROLES.includes(user.role)) return
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    const handler = () => resetInactivityTimer()
    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    resetInactivityTimer()
    return () => {
      events.forEach(e => window.removeEventListener(e, handler))
      clearInactivityTimer()
    }
  }, [user, resetInactivityTimer, clearInactivityTimer])

  // ── PERSIST TOKENS + USER ─────────────────────────────────────────────────
  // refreshToken is stored as an HttpOnly cookie by the backend — never touch it here.
  const persistSession = (userData, accessToken, branch = null) => {
    setToken(accessToken)
    localStorage.setItem('user', JSON.stringify(userData))
    if (branch) {
      localStorage.setItem('currentBranch', JSON.stringify(branch))
    } else {
      localStorage.removeItem('currentBranch')
    }
    setUser(userData)
    setCurrentBranch(branch)
  }

  // ── AUTH ACTIONS ──────────────────────────────────────────────────────────

  // Step 1: validate credentials
  // Returns { requiresBranchSelection, user, branches, preAuthToken } for admins
  // Returns { requiresBranchSelection: false, user, accessToken } for customers
  const login = useCallback(async (phone, password) => {
    const res = await authService.login({ phone, password })
    const data = res.data.data

    if (!data.requiresBranchSelection) {
      // Customer/driver/first-time-superadmin — immediate session; cookie set by server
      persistSession(data.user, data.accessToken, null)
      return { requiresBranchSelection: false, user: data.user, firstTimeSetup: !!data.firstTimeSetup }
    }

    // Admin — clear any stale session before branch selection completes
    sessionStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    localStorage.removeItem('currentBranch')
    setUser(null)
    setCurrentBranch(null)

    // Return branch info to LoginPage for step 2
    return {
      requiresBranchSelection: true,
      preAuthToken: data.preAuthToken,
      branches: data.branches,
      user: data.user
    }
  }, [])

  // Step 2: admin selects branch; refreshToken cookie set by server
  const selectBranch = useCallback(async (preAuthToken, branchId) => {
    const res = await authService.selectBranch(preAuthToken, branchId)
    const data = res.data.data
    persistSession(data.user, data.accessToken, data.branch)
    return data
  }, [])

  // Superadmin switches branch while already logged in; old cookie revoked by server
  const switchBranch = useCallback(async (branchId) => {
    const res = await authService.switchBranch(branchId)
    const data = res.data.data
    setToken(data.accessToken)
    const branch = data.branch || null
    if (branch) {
      localStorage.setItem('currentBranch', JSON.stringify(branch))
    } else {
      localStorage.removeItem('currentBranch')
    }
    setCurrentBranch(branch)
    return data
  }, [])

  const register = useCallback(async (data) => {
    const res = await authService.register(data)
    const { user: userData, accessToken } = res.data.data
    persistSession(userData, accessToken, null)
    return userData
  }, [])

  const logout = useCallback(async () => {
    try {
      // Cookie is sent automatically — backend blacklists it and clears it
      await authService.logout()
    } catch {}
    clearInactivityTimer()
    clearToken()
    localStorage.removeItem('user')
    localStorage.removeItem('currentBranch')
    setUser(null)
    setCurrentBranch(null)
  }, [clearInactivityTimer])

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates }
      localStorage.setItem('user', JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider value={{
      user, isLoading, currentBranch,
      isAuthenticated: !!user,
      isLoggedIn: !!user,
      isAdmin: !!user && ADMIN_ROLES.includes(user.role),
      isCustomer: user?.role === 'customer',
      isSuperAdmin: user?.role === 'superadmin',
      login, selectBranch, switchBranch, register, logout, updateUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
