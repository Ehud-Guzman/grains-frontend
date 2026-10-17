import api from '../api'

const BASE = '/admin/control-center'

// Superadmin-only. Actions that the server guards with a password take it as the last
// argument and send it in the body; the server answers 403 PASSWORD_REQUIRED /
// PASSWORD_INCORRECT (never 401, which would sign the user out).
export const adminControlCenterService = {
  overview: () => api.get(`${BASE}/overview`, { timeout: 60000 }),

  accounts: () => api.get(`${BASE}/accounts`),
  signOut: (id) => api.post(`${BASE}/accounts/${id}/sign-out`),
  signOutAll: (scope, password) => api.post(`${BASE}/accounts/sign-out-all`, { scope, password }),

  setSwitches: (branchId, patch, password) =>
    api.put(`${BASE}/branches/${branchId}/switches`, password ? { ...patch, password } : patch),
  lockAll: (locked, password) => api.put(`${BASE}/lock-all`, { locked, password }),
  setJobPaused: (name, paused) => api.put(`${BASE}/jobs/${name}`, { paused }),

  security: (days = 7) => api.get(`${BASE}/security`, { params: { days } }),
  rawEntry: (id) => api.get(`${BASE}/audit/${id}`),
  exportAudit: (params) => api.get(`${BASE}/audit/export`, { params, responseType: 'blob', timeout: 120000 }),

  integrity: () => api.get(`${BASE}/integrity`, { timeout: 60000 }),
  permissions: () => api.get(`${BASE}/permissions`),
}
