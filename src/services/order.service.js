import api from './api'

export const orderService = {
  placeGuestOrder: (data) => api.post('/orders/guest', data),
  placeOrder: (data) => api.post('/orders', data),
  trackOrder: (phone, ref) => api.get('/orders/track', { params: { phone, ref } }),
  getMyOrders: (params) => api.get('/orders/my', { params }),
  cancelOrder: (id) => api.patch(`/orders/${id}/cancel`)
}
