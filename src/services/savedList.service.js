import api from './api'

export const savedListService = {
  getMyLists: () => api.get('/lists'),
  getListById: (id) => api.get(`/lists/${id}`),
  createList: (data) => api.post('/lists', data),
  updateList: (id, data) => api.put(`/lists/${id}`, data),
  deleteList: (id) => api.delete(`/lists/${id}`),
}
