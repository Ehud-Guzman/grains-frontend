import api from '../api'

// Backups and restores run as background jobs on the server (?async=true): the request answers 202 at once
// and the page polls for the result. A long operation used to be one request, and the hosting proxy gives up
// on those after ~26 seconds with a 504 while the work carries on - so the admin was told "failed" about
// something that was still running, and tried again.
const POLL_MS = 1500
const MAX_WAIT_MS = 20 * 60 * 1000
const MAX_POLL_FAILURES = 8
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const adminBackupService = {
  list: () => api.get('/admin/backups'),
  startCreate: () => api.post('/admin/backups?async=true'),
  download: (id) => api.get(`/admin/backups/${id}/download`, { responseType: 'blob' }),
  remove: (id) => api.delete(`/admin/backups/${id}`),
  startRestore: (file, confirmation) => {
    const formData = new FormData()
    formData.append('backup', file)
    formData.append('confirmation', confirmation)

    // Only the upload is waited for here; the restore itself is then polled with waitForJob.
    return api.post('/admin/backups/restore?async=true', formData, { timeout: 120000 })
  },
  job: (id) => api.get(`/admin/backups/jobs/${id}`),

  // Poll a job until it finishes. Resolves with the job's result; rejects with an Error carrying the
  // server's message/code if it failed. `onProgress(job.progress)` is called on every poll.
  async waitForJob(id, onProgress) {
    const startedAt = Date.now()
    let failures = 0
    while (Date.now() - startedAt < MAX_WAIT_MS) {
      await sleep(POLL_MS)
      let job
      try {
        job = (await adminBackupService.job(id)).data.data
        failures = 0
      } catch (err) {
        // A single dropped poll must not look like a failed restore - the job carries on server-side.
        if (err.response?.data?.error === 'JOB_NOT_FOUND') throw err
        if (++failures >= MAX_POLL_FAILURES) throw err
        continue
      }
      if (onProgress) onProgress(job.progress, job)
      if (job.state === 'done') return job.result
      if (job.state === 'failed') {
        const error = new Error(job.error?.message || 'The job failed')
        error.code = job.error?.code
        throw error
      }
    }
    throw new Error('This is taking unusually long. Check the backup list in a few minutes before trying again.')
  },
}
