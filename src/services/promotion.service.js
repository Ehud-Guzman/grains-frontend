import api from './api';

export const promotionService = {
  // Public — active promotions for the storefront (needs branchId query param)
  getActive:  (branchId) => api.get('/promotions', { params: { branchId } }),

  // Admin
  uploadImage: (file) => {
    const fd = new FormData()
    fd.append('image', file)
    return api.post('/admin/promotions/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  uploadVideo: (file) => {
    const fd = new FormData()
    fd.append('video', file)
    return api.post('/admin/promotions/upload-video', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  getAll:     ()         => api.get('/admin/promotions'),
  getById:    (id)       => api.get(`/admin/promotions/${id}`),
  create:     (data)     => api.post('/admin/promotions', data),
  update:     (id, data) => api.put(`/admin/promotions/${id}`, data),
  remove:     (id)       => api.delete(`/admin/promotions/${id}`),
};
