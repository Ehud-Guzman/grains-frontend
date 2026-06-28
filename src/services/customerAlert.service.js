import api from './api'

export const customerAlertService = {
  getMyAlerts: () => api.get('/alerts'),
  subscribe: (data) => api.post('/alerts', data),
  unsubscribe: (id) => api.delete(`/alerts/${id}`),
}
