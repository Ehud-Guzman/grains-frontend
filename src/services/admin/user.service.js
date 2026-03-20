import api from '../api'
export const adminUserService = {
  getAll: (params) => api.get('/admin/users', { params }),
  create: (data) => api.post('/admin/users', data),
  changeRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  lock: (id) => api.patch(`/admin/users/${id}/lock`),
  unlock: (id) => api.patch(`/admin/users/${id}/unlock`),
  resetPassword: (id, password) => api.patch(`/admin/users/${id}/reset-password`, { password }),
}
