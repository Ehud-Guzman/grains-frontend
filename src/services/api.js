import axios from 'axios'

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

    const token = sessionStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── RESPONSE INTERCEPTOR ──────────────────────────────────────────────────────
// On 401: attempt token refresh, retry original request
// On refresh failure: logout
let isRefreshing = false
let failedQueue = []

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

    // Don't intercept 401s from the login endpoint — wrong credentials are expected there
    if (originalRequest.url?.includes('/auth/login')) {
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
        // No body payload needed; withCredentials ensures the cookie is included.
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
          {},
          { withCredentials: true }
        )

        const { accessToken: newAccessToken, user } = response.data.data

        sessionStorage.setItem('accessToken', newAccessToken)
        if (user) {
          localStorage.setItem('user', JSON.stringify(user))
        }

        processQueue(null, newAccessToken)
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)

      } catch (refreshError) {
        processQueue(refreshError, null)
        // Clear local state and redirect to login
        sessionStorage.removeItem('accessToken')
        localStorage.removeItem('user')
        localStorage.removeItem('currentBranch')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
