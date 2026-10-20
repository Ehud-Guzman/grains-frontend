import api from './api'

// The server gives Daraja up to ~10s for its access token plus ~12s for the push itself (about 22s worst
// case), so a slow Safaricom response can legitimately take longer than the app-wide 15s timeout. Giving up
// at 15s told the customer "payment failed" while the prompt was in fact on its way to their phone. It must
// stay near the proxy's own ~26s response limit, though: past that the browser gets a 504 regardless.
export const STK_INITIATE_TIMEOUT = 30000

export const paymentService = {
  // Initiate STK push — returns { checkoutRequestId, paymentId }.
  // `phone` is the STK target; `contactPhone` is the order's contact number,
  // which is what proves guest ownership server-side when the two differ.
  initiate: (orderId, phone, contactPhone) =>
    api.post('/payments/mpesa/initiate', { orderId, phone, contactPhone }, { timeout: STK_INITIATE_TIMEOUT }),

  // Move an unpaid, still-pending order to another payment method (mpesa | pickup |
  // delivery). `contactPhone` proves ownership for guests, as it does for initiate.
  changeMethod: (orderId, paymentMethod, contactPhone) =>
    api.post('/payments/change-method', { orderId, paymentMethod, contactPhone }),

  // Poll payment status — call every 5s after STK push
  // POST so a guest's phone number travels in the body, not the URL.
  getStatus: (orderId, phone) =>
    api.post(`/payments/status/${orderId}`, phone ? { phone } : {}),
}
