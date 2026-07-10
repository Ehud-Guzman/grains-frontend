import api, { setToken } from './api'

export const authService = {
  register: (data) => api.post('/auth/register', data),

  login: (data) => api.post('/auth/login', data),

  // Step 2 of admin login: exchange preAuthToken + chosen branchId for full tokens
  selectBranch: (preAuthToken, branchId) =>
    api.post('/auth/select-branch', { preAuthToken, branchId }),

  // Superadmin switches branch context while logged in (branchId = null for global view)
  switchBranch: (branchId) => api.post('/auth/switch-branch', { branchId }),

  // refreshToken is an HttpOnly cookie — the browser sends it automatically.
  // No body payload needed; withCredentials on the axios instance handles it.
  logout: () => api.post('/auth/logout'),

  // refreshToken sent as cookie; empty body is intentional.
  // Callers may pass axios config (e.g. a longer timeout for cold starts).
  refresh: (config) => api.post('/auth/refresh', {}, config),

  // Backend invalidates all previously-issued tokens on a password change
  // (including this request's own) and reissues a fresh pair — update the
  // in-memory access token here so the caller's session survives transparently.
  // The refresh cookie is set by the server response itself.
  changePassword: async (currentPassword, newPassword) => {
    const res = await api.post('/auth/change-password', { currentPassword, newPassword })
    const newAccessToken = res.data?.data?.accessToken
    if (newAccessToken) setToken(newAccessToken)
    return res
  },

  forgotPassword: (phone) => api.post('/auth/forgot-password', { phone }),

  resetPassword: (phone, otp, newPassword) =>
    api.post('/auth/reset-password', { phone, otp, newPassword }),

  getProfile: () => api.get('/auth/me'),

  updateProfile: (data) => api.put('/auth/me', data),

  getOnboarding: () => api.get('/auth/onboarding'),

  updateOnboarding: (data) => api.patch('/auth/onboarding', data),

  uploadAvatar: (formData) => api.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
}
