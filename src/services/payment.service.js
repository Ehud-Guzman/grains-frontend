import api from './api'

export const paymentService = {
  // Initiate STK push — returns { checkoutRequestId, paymentId }.
  // `phone` is the STK target; `contactPhone` is the order's contact number,
  // which is what proves guest ownership server-side when the two differ.
  initiate: (orderId, phone, contactPhone) =>
    api.post('/payments/mpesa/initiate', { orderId, phone, contactPhone }),

  // Poll payment status — call every 5s after STK push
  getStatus: (orderId, phone) =>
    api.get(`/payments/status/${orderId}`, { params: phone ? { phone } : undefined }),
}
