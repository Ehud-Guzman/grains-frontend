import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { authService } from '../services/auth.service'

const AuthContext = createContext(null)

const ADMIN_ROLES = ['staff', 'supervisor', 'admin', 'superadmin']
const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes in ms

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const inactivityTimer = useRef(null)

  useEffect(() => {
    try {
      const stored      = localStorage.getItem('user')
      const accessToken = sessionStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')
      if (stored && (accessToken || refreshToken)) {
        setUser(JSON.parse(stored))
      }
    } catch {
      sessionStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
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
      // Auto-logout admin after 30 mins inactivity
      const refreshToken = localStorage.getItem('refreshToken')
      authService.logout(refreshToken).catch(() => {})
      sessionStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      setUser(null)
      window.location.href = '/login?reason=inactivity'
    }, INACTIVITY_TIMEOUT)
  }, [user, clearInactivityTimer])

  // Attach activity listeners for admin users
  useEffect(() => {
    if (!user || !ADMIN_ROLES.includes(user.role)) return

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    const handler = () => resetInactivityTimer()

    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    resetInactivityTimer() // Start timer on login

    return () => {
      events.forEach(e => window.removeEventListener(e, handler))
      clearInactivityTimer()
    }
  }, [user, resetInactivityTimer, clearInactivityTimer])

  // ── AUTH ACTIONS ──────────────────────────────────────────────────────────
  const login = useCallback(async (phone, password) => {
    const res = await authService.login({ phone, password })
    const { user: userData, accessToken, refreshToken } = res.data.data
    sessionStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const register = useCallback(async (data) => {
    const res = await authService.register(data)
    const { user: userData, accessToken, refreshToken } = res.data.data
    sessionStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      // Send refresh token so server can blacklist it
      await authService.logout(refreshToken)
    } catch {}
    clearInactivityTimer()
    sessionStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
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
      user, isLoading,
      isAuthenticated: !!user,
      isLoggedIn: !!user,
      isAdmin: !!user && ADMIN_ROLES.includes(user.role),
      isCustomer: user?.role === 'customer',
      login, register, logout, updateUser
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