import api from '../api'
export const adminStockService = {
  getOverview: (params) => api.get('/admin/stock', { params }),
  getLowStock: () => api.get('/admin/stock/low'),
  getForecast: (params) => api.get('/admin/stock/forecast', { params }),
  getLogs: (productId, params) => api.get(`/admin/stock/${productId}/logs`, { params }),
  addDelivery: (data) => api.post('/admin/stock/delivery', data),
  adjust: (data) => api.post('/admin/stock/adjust', data),
  batch: (updates) => api.post('/admin/stock/batch', { updates }),
}
