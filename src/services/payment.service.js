import api from './api'

export const paymentService = {
  // Initiate STK push — returns { checkoutRequestId, paymentId }
  initiate: (orderId, phone, amount) =>
    api.post('/payments/mpesa/initiate', { orderId, phone, amount }),

  // Poll payment status — call every 5s after STK push
  getStatus: (orderId, phone) =>
    api.get(`/payments/status/${orderId}`, { params: phone ? { phone } : undefined }),
}
