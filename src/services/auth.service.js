import api from './api'

export const authService = {
  register: (data) => api.post('/auth/register', data),

  login: (data) => api.post('/auth/login', data),

  // Step 2 of admin login: exchange preAuthToken + chosen branchId for full tokens
  selectBranch: (preAuthToken, branchId) =>
    api.post('/auth/select-branch', { preAuthToken, branchId }),

  // Superadmin switches branch context while logged in (branchId = null for global view)
  switchBranch: (branchId) => api.post('/auth/switch-branch', { branchId }),

  // Send refreshToken in body so server blacklists it on logout
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),

  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),

  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),

  getProfile: () => api.get('/auth/me'),

  updateProfile: (data) => api.put('/auth/me', data),

  getOnboarding: () => api.get('/auth/onboarding'),

  updateOnboarding: (data) => api.patch('/auth/onboarding', data),

  uploadAvatar: (formData) => api.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
}
