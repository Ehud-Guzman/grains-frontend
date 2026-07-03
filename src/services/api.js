import axios from 'axios'

// ── IN-MEMORY TOKEN STORE ─────────────────────────────────────────────────────
// Storing the access token in sessionStorage exposes it to XSS. Keeping it in a
// module-level variable means it lives only in JS heap — inaccessible to injected
// scripts. On page reload the token is gone, so the interceptor calls /auth/refresh
// which reads the HttpOnly refreshToken cookie to issue a new access token.
let _accessToken = null

export const setToken  = (token) => { _accessToken = token }
export const clearToken = ()      => { _accessToken = null  }
export const getToken  = ()       => _accessToken

// ── SHOP BRANCH STORE ─────────────────────────────────────────────────────────
// The storefront branch (resolved by geolocation or manual pick — see
// BranchContext). Kept module-level so the request interceptor can inject it
// into public shop requests without every call site threading it through.
let _shopBranchId = null

export const setShopBranchId = (branchId) => { _shopBranchId = branchId || null }
export const getShopBranchId = () => _shopBranchId

// Public storefront endpoints that are branch-scoped. Admin/auth endpoints get
// their branch from the JWT — never from this param.
const BRANCH_SCOPED_PREFIXES = ['/products', '/promotions', '/settings']

const isBranchScopedShopRequest = (config) => {
  if ((config.method || 'get').toLowerCase() !== 'get') return false
  const url = config.url || ''
  return BRANCH_SCOPED_PREFIXES.some(p => url === p || url.startsWith(`${p}/`) || url.startsWith(`${p}?`))
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  // Required so the browser sends the HttpOnly refreshToken cookie on auth requests
  withCredentials: true,
})

// ── REQUEST INTERCEPTOR ───────────────────────────────────────────────────────
// Attach access token to every request
api.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }

    const token = _accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Scope public shop requests to the resolved branch. An explicitly passed
    // branchId param wins; an absent/undefined one gets the resolved branch
    // (callers like promotionService.getActive(undefined) must not blank it).
    if (_shopBranchId && isBranchScopedShopRequest(config)) {
      config.params = config.params || {}
      if (config.params.branchId == null) config.params.branchId = _shopBranchId
    }

    return config
  },
  (error) => Promise.reject(error)
)

// ── RESPONSE INTERCEPTOR ──────────────────────────────────────────────────────
// On 401: attempt token refresh, retry original request
// On refresh failure: clear the session and notify AuthContext (no hard redirect —
// ProtectedRoute handles navigation, so guests on public pages are never bounced
// to /login and logged-in users keep their return path via state.from).
let isRefreshing = false
let failedQueue = []

// Auth endpoints must never trigger a token refresh on 401:
// login/register 401 = wrong credentials, refresh 401 = expired cookie,
// select-branch 401 = expired preAuthToken. Each surfaces its own error.
const NO_REFRESH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/select-branch',
  '/auth/logout',
]

const clearSession = () => {
  clearToken()
  localStorage.removeItem('user')
  localStorage.removeItem('currentBranch')
  // AuthContext listens for this and clears React state, which lets
  // ProtectedRoute redirect with the current location preserved.
  window.dispatchEvent(new Event('auth:session-expired'))
}

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (NO_REFRESH_PATHS.some(path => originalRequest?.url?.includes(path))) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }).catch(err => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Refresh token is sent automatically as an HttpOnly cookie.
        // Generous timeout: Render free tier can take ~30s to cold-start, and
        // every queued request is waiting on this one call.
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
          {},
          { withCredentials: true, timeout: 65000 }
        )

        const { accessToken: newAccessToken, user } = response.data.data

        setToken(newAccessToken)
        if (user) {
          localStorage.setItem('user', JSON.stringify(user))
        }

        processQueue(null, newAccessToken)
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)

      } catch (refreshError) {
        processQueue(refreshError, null)
        // Only a real auth rejection means the session is gone. A network
        // error or cold-start timeout must not destroy a valid session.
        if (refreshError.response) {
          clearSession()
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
