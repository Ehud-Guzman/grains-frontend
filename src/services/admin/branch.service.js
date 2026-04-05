import api from '../api'

export const adminBranchService = {
  getAll: (includeInactive = false) =>
    api.get('/admin/branches', { params: includeInactive ? { includeInactive: true } : {} }),
  getOne: (id) => api.get(`/admin/branches/${id}`),
  create: (data) => api.post('/admin/branches', data),
  update: (id, data) => api.put(`/admin/branches/${id}`, data),
  deactivate: (id) => api.delete(`/admin/branches/${id}`),
  getStaff: (id) => api.get(`/admin/branches/${id}/staff`),
  assignUser: (id, userId) => api.post(`/admin/branches/${id}/assign-user`, { userId }),
}
