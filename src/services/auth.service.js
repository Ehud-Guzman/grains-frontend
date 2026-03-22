import api from './api'

export const authService = {
  register: (data) => api.post('/auth/register', data),

  login: (data) => api.post('/auth/login', data),

  // Send refreshToken in body so server blacklists it on logout
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),

  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),

  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),

  getProfile: () => api.get('/auth/me'),

  updateProfile: (data) => api.put('/auth/me', data),

  uploadAvatar: (formData) => api.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
}