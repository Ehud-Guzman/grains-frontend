import api from '../api'

export const adminPaymentService = {
  confirmManual: (orderId, transactionRef) =>
    api.post(`/admin/payments/${orderId}/confirm-manual`, transactionRef ? { transactionRef } : {}),
}
