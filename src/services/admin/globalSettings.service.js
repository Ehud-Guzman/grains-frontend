import api from '../api'

export const globalSettingsService = {
  get:    ()     => api.get('/admin/global-settings'),
  update: (data) => api.put('/admin/global-settings', data),

  // eTIMS manual resubmit for a specific order
  etimsResubmit: (orderId) => api.post(`/admin/orders/${orderId}/etims/resubmit`),
}
