import api from './api'

export const driverService = {
  getMe:             () => api.get('/driver/me'),
  setAvailability:   (available) => api.patch('/driver/availability', { available }),
  getMyOrders:       (params) => api.get('/driver/orders', { params }),
  getOrderDetail:    (id) => api.get(`/driver/orders/${id}`),
  // body is an optional FormData with proof of delivery (photo/recipientName/note)
  completeDelivery:  (id, body) => api.patch(`/driver/orders/${id}/complete`, body),
}
