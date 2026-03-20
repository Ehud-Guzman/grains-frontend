import api from '../api'
export const adminLogService = {
  getLogs: (params) => api.get('/admin/logs', { params }),
}