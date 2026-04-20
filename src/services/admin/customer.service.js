import api from '../api'
export const adminCustomerService = {
  getAll: (params) => api.get('/admin/customers', { params }),
  getProfile: (id) => api.get(`/admin/customers/${id}`),
  addNote: (id, note) => api.post(`/admin/customers/${id}/notes`, { note }),
  getSegments: () => api.get('/admin/customers/segments'),
  lock: (id) => api.patch(`/admin/customers/${id}/lock`),
  unlock: (id) => api.patch(`/admin/customers/${id}/unlock`),
}
