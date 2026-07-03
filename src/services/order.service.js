import api from './api'

// Order placement gets a long timeout: aborting client-side while the server
// is still processing (slow network / cold start) creates duplicate orders on
// retry. Better to wait than to lie to the user that it failed.
const PLACE_ORDER_TIMEOUT = 60000

export const orderService = {
  placeGuestOrder: (data) => api.post('/orders/guest', data, { timeout: PLACE_ORDER_TIMEOUT }),
  placeOrder: (data) => api.post('/orders', data, { timeout: PLACE_ORDER_TIMEOUT }),
  trackOrder: (phone, ref) => api.get('/orders/track', { params: { phone, ref } }),
  getMyOrders: (params) => api.get('/orders/my', { params }),
  getMyOrder: (id) => api.get(`/orders/my/${id}`),
  getMyStats: () => api.get('/orders/my/stats'),
  cancelOrder: (id) => api.patch(`/orders/${id}/cancel`)
}
