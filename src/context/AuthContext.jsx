import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { authService } from '../services/auth.service'

const AuthContext = createContext(null)

const ADMIN_ROLES = ['staff', 'supervisor', 'admin', 'superadmin']
const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes in ms

export const AuthProvider = ({ children }) => {
  const [user, setUser]           = useState(null)
  const [currentBranch, setCurrentBranch] = useState(null) // { id, name, slug, location }
  const [isLoading, setIsLoading] = useState(true)
  const inactivityTimer = useRef(null)

  useEffect(() => {
    try {
      const stored       = localStorage.getItem('user')
      const storedBranch = localStorage.getItem('currentBranch')
      const accessToken  = sessionStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')
      if (stored && (accessToken || refreshToken)) {
        setUser(JSON.parse(stored))
        if (storedBranch) setCurrentBranch(JSON.parse(storedBranch))
      }
    } catch {
      sessionStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      localStorage.removeItem('currentBranch')
    } finally {
      setIsLoading(false)
    }
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
    inactivityTimer.current = setTimeout(() => {
      const refreshToken = localStorage.getItem('refreshToken')
      authService.logout(refreshToken).catch(() => {})
      sessionStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
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
  const persistSession = (userData, accessToken, refreshToken, branch = null) => {
    sessionStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
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
  // Returns { requiresBranchSelection: false, user, accessToken, refreshToken } for customers
  const login = useCallback(async (phone, password) => {
    const res = await authService.login({ phone, password })
    const data = res.data.data

    if (!data.requiresBranchSelection) {
      // Customer — immediate session
      persistSession(data.user, data.accessToken, data.refreshToken, null)
      return { requiresBranchSelection: false, user: data.user }
    }

    // Admin — return branch info to LoginPage for step 2
    return {
      requiresBranchSelection: true,
      preAuthToken: data.preAuthToken,
      branches: data.branches,
      user: data.user
    }
  }, [])

  // Step 2: admin selects branch
  const selectBranch = useCallback(async (preAuthToken, branchId) => {
    const res = await authService.selectBranch(preAuthToken, branchId)
    const data = res.data.data
    persistSession(data.user, data.accessToken, data.refreshToken, data.branch)
    return data
  }, [])

  // Superadmin switches branch while already logged in
  const switchBranch = useCallback(async (branchId) => {
    const res = await authService.switchBranch(branchId)
    const data = res.data.data
    sessionStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
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
    const { user: userData, accessToken, refreshToken } = res.data.data
    persistSession(userData, accessToken, refreshToken, null)
    return userData
  }, [])

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      await authService.logout(refreshToken)
    } catch {}
    clearInactivityTimer()
    sessionStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
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
