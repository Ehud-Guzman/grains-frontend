import api from '../api'

export const adminDriverService = {
  getAll:          (params) => api.get('/admin/drivers', { params }),
  getById:         (id) => api.get(`/admin/drivers/${id}`),
  create:          (data) => api.post('/admin/drivers', data),
  getOrders:       (id, params) => api.get(`/admin/drivers/${id}/orders`, { params }),
  getStats:        (id) => api.get(`/admin/drivers/${id}/stats`),
  lock:            (id) => api.patch(`/admin/drivers/${id}/lock`),
  unlock:          (id) => api.patch(`/admin/drivers/${id}/unlock`),
  resetPassword:   (id, password) => api.patch(`/admin/drivers/${id}/reset-password`, { password }),
  updateVehicle:   (id, data) => api.patch(`/admin/drivers/${id}/vehicle`, data),
  assignToOrder:   (orderId, driverId) => api.patch(`/admin/orders/${orderId}/assign-driver`, { driverId }),
}
