import api from './api'

export const branchService = {
  // Public — active branches for the storefront picker
  getAll: () => api.get('/branches'),
  // Public — resolve nearest branch from customer coordinates
  nearest: (lat, lng) => api.get('/branches/nearest', { params: { lat, lng } }),
  // Public — available riders for checkout selection
  getRiders: (branchId) => api.get(`/branches/${branchId}/riders`),
}
