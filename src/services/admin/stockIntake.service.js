import api from '../api'

export const stockIntakeService = {
  list:          (params) => api.get('/admin/stock-intake', { params }),
  getOne:        (id)     => api.get(`/admin/stock-intake/${id}`),
  create:        (data)   => api.post('/admin/stock-intake', data),
  markProcessed: (id, processedNotes) => api.patch(`/admin/stock-intake/${id}/process`, { processedNotes }),
  remove:        (id)     => api.delete(`/admin/stock-intake/${id}`),
}
