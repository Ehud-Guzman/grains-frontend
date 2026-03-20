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
}
