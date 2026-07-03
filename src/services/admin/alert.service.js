import api from '../api'
export const adminAlertService = {
  getDashboard: () => api.get('/admin/alerts'),
}
