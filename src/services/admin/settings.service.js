import api from '../api'

export const adminSettingsService = {
  get:             ()              => api.get('/admin/settings'),
  update:          (data)          => api.put('/admin/settings', data),
  // Superadmin cross-branch
  getForBranch:    (branchId)      => api.get(`/admin/settings/branch/${branchId}`),
  updateForBranch: (branchId, data) => api.put(`/admin/settings/branch/${branchId}`, data),
}

export const publicSettingsService = {
  get: () => api.get('/settings'),
}