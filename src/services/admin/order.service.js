import api from '../api'
export const adminOrderService = {
  getAll: (params) => api.get('/admin/orders', { params }),
  getById: (id) => api.get(`/admin/orders/${id}`),
  approve: (id) => api.patch(`/admin/orders/${id}/approve`),
  reject: (id, reason) => api.patch(`/admin/orders/${id}/reject`, { reason }),
  updateStatus: (id, status, note) => api.patch(`/admin/orders/${id}/status`, { status, note }),
  bulkApprove: (orderIds) => api.post('/admin/orders/bulk-approve', { orderIds }),
  bulkReject: (orderIds, reason) => api.post('/admin/orders/bulk-reject', { orderIds, reason }),
  getPackingSlip: (id) => api.get(`/admin/orders/${id}/packing-slip`),
  // The credit note for an invoiced order that was cancelled has been filed with KRA.
  recordCreditNote: (id, reference) => api.post(`/admin/orders/${id}/etims/credit-note`, { reference }),
  // No reference: the server sends the credit note to KRA itself (needs eTIMS switched on).
  sendCreditNote: (id) => api.post(`/admin/orders/${id}/etims/credit-note`, {}),
}
