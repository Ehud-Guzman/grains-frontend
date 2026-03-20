import api from '../api'

export const adminSettingsService = {
  get: () => api.get('/admin/settings'),
  update: (data) => api.put('/admin/settings', data),
}

export const publicSettingsService = {
  get: () => api.get('/settings'),
}