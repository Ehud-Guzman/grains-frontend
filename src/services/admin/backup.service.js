import api from '../api'

export const adminBackupService = {
  list: () => api.get('/admin/backups'),
  create: () => api.post('/admin/backups'),
  download: (id) => api.get(`/admin/backups/${id}/download`, { responseType: 'blob' }),
  remove: (id) => api.delete(`/admin/backups/${id}`),
  restore: (file, confirmation) => {
    const formData = new FormData()
    formData.append('backup', file)
    formData.append('confirmation', confirmation)

    return api.post('/admin/backups/restore', formData, {
      timeout: 120000,
    })
  },
}
