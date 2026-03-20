import api from '../api'
export const adminReportService = {
  getKPIs: () => api.get('/admin/reports/kpis'),
  getSales: (params) => api.get('/admin/reports/sales', { params }),
  getBestSellers: (params) => api.get('/admin/reports/best-sellers', { params }),
  getSlowMovers: (params) => api.get('/admin/reports/slow-movers', { params }),
  getStockValuation: () => api.get('/admin/reports/stock-valuation'),
  getStockMovement: (params) => api.get('/admin/reports/stock-movement', { params }),
  getCustomers: () => api.get('/admin/reports/customers'),
  getOrders: (params) => api.get('/admin/reports/orders', { params }),
  exportCSV: (type, params) => api.get(`/admin/reports/export/${type}`, {
    params,
    responseType: 'blob'
  }),
}
