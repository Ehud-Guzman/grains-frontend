import api from '../api'

export const adminPaymentService = {
  confirmManual: (orderId) => api.post(`/admin/payments/${orderId}/confirm-manual`),
}
