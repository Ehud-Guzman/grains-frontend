import api from '../api'

export const adminPaymentService = {
  confirmManual: (orderId, transactionRef, receivedAmount) => {
    const body = {}
    if (transactionRef) body.transactionRef = transactionRef
    if (receivedAmount != null) body.receivedAmount = receivedAmount
    return api.post(`/admin/payments/${orderId}/confirm-manual`, body)
  },
  // Money has gone back to the customer for a cancelled/rejected paid order. body: { method, reference?, amount?, note? }
  recordRefundSent: (orderId, body) => api.post(`/admin/payments/${orderId}/refund-sent`, body),
  // Close a flagged M-Pesa payment (money that arrived but was not credited, or receipts that do not match).
  resolveException: (paymentId, note) => api.post(`/admin/payments/${paymentId}/resolve-exception`, { note }),
}
