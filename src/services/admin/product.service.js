import api from '../api'
export const adminProductService = {
  getAll: (params) => api.get('/admin/products', { params }),
  getById: (id) => api.get(`/admin/products/${id}`),
  create: (data) => api.post('/admin/products', data),
  update: (id, data) => api.put(`/admin/products/${id}`, data),
  toggleActive: (id) => api.patch(`/admin/products/${id}/toggle-active`),
  duplicate: (id) => api.post(`/admin/products/${id}/duplicate`),
  delete: (id) => api.delete(`/admin/products/${id}`),
  uploadImages: (formData) => api.post('/admin/products/upload-images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
}
