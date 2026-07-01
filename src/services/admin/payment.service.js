import api from '../api'

export const adminPaymentService = {
  confirmManual: (orderId, transactionRef, receivedAmount) => {
    const body = {}
    if (transactionRef) body.transactionRef = transactionRef
    if (receivedAmount != null) body.receivedAmount = receivedAmount
    return api.post(`/admin/payments/${orderId}/confirm-manual`, body)
  },
}
