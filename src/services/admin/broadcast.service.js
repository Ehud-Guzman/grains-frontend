import api from '../api'
export const adminBroadcastService = {
  getAudienceCount: (audience) => api.get('/admin/broadcast/audience-count', { params: { audience } }),
  send: (data) => api.post('/admin/broadcast/sms', data),
}
