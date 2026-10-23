import api from '../api'
export const adminReportService = {
  getKPIs: () => api.get('/admin/reports/kpis'),
  getSales: (params) => api.get('/admin/reports/sales', { params }),
  getBestSellers: (params) => api.get('/admin/reports/best-sellers', { params }),
  getSlowMovers: (params) => api.get('/admin/reports/slow-movers', { params }),
  getStockValuation: () => api.get('/admin/reports/stock-valuation'),
  getStockTurnover: (params) => api.get('/admin/reports/stock-turnover', { params }),
  getStockMovement: (params) => api.get('/admin/reports/stock-movement', { params }),
  getCustomers: (params) => api.get('/admin/reports/customers', { params }),
  getOrders: (params) => api.get('/admin/reports/orders', { params }),
  getOnboarding: () => api.get('/admin/reports/onboarding'),
  getMargins: (params) => api.get('/admin/reports/margins', { params }),
  getRiders: (params) => api.get('/admin/reports/riders', { params }),
  getCashUp: (params) => api.get('/admin/reports/cash-up', { params }),
  getVat: (params) => api.get('/admin/reports/vat', { params }),
  getCustomerStatement: (customerId, params) => api.get(`/admin/reports/customer-statement/${customerId}`, { params }),
  exportCSV: (type, params) => api.get(`/admin/reports/export/${type}`, {
    params,
    responseType: 'blob'
  }),
}
