import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))
import api from '../api'
import { adminBackupService } from './backup.service'

const jobResponse = (job) => ({ data: { data: job } })

describe('adminBackupService.waitForJob', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

  const run = async (promise) => {
    // Attach a handler first so a rejection while the fake clock advances is never "unhandled".
    const settled = promise.then((value) => ({ value }), (error) => ({ error }))
    for (let i = 0; i < 40; i++) await vi.advanceTimersByTimeAsync(1500)
    const outcome = await settled
    if ('error' in outcome) throw outcome.error
    return outcome.value
  }

  it('polls until the job is done and returns its result, reporting progress along the way', async () => {
    api.get
      .mockResolvedValueOnce(jobResponse({ state: 'running', progress: { phase: 'backup', collection: 'orders' } }))
      .mockResolvedValueOnce(jobResponse({ state: 'done', progress: {}, result: { id: 'backup_1' } }))
    const seen = []
    const result = await run(adminBackupService.waitForJob('j1', (p) => seen.push(p)))
    expect(result).toEqual({ id: 'backup_1' })
    expect(seen[0]).toEqual({ phase: 'backup', collection: 'orders' })
    expect(api.get).toHaveBeenCalledWith('/admin/backups/jobs/j1')
  })

  it('rejects with the server message and code when the job failed', async () => {
    api.get.mockResolvedValue(jobResponse({ state: 'failed', error: { message: 'Backup file is not valid', code: 'INVALID_BACKUP_FILE' } }))
    const err = await run(adminBackupService.waitForJob('j2')).catch((e) => e)
    expect(err.message).toBe('Backup file is not valid')
    expect(err.code).toBe('INVALID_BACKUP_FILE')
  })

  it('a few dropped polls do not look like a failure (the job carries on server-side)', async () => {
    api.get
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce(jobResponse({ state: 'done', result: { ok: true } }))
    expect(await run(adminBackupService.waitForJob('j3'))).toEqual({ ok: true })
  })

  it('gives up after repeated failures, and straight away if the server no longer knows the job', async () => {
    api.get.mockRejectedValue(new Error('Network Error'))
    await expect(run(adminBackupService.waitForJob('j4'))).rejects.toThrow('Network Error')
    expect(api.get).toHaveBeenCalledTimes(8)

    api.get.mockReset()
    api.get.mockRejectedValue({ response: { data: { error: 'JOB_NOT_FOUND' } } })
    await expect(run(adminBackupService.waitForJob('j5'))).rejects.toMatchObject({ response: { data: { error: 'JOB_NOT_FOUND' } } })
    expect(api.get).toHaveBeenCalledTimes(1)
  })
})

describe('adminBackupService requests', () => {
  it('starts create and restore as background jobs', () => {
    adminBackupService.startCreate()
    expect(api.post).toHaveBeenCalledWith('/admin/backups?async=true')
    adminBackupService.startRestore(new Blob(['x']), 'RESTORE')
    expect(api.post.mock.calls[1][0]).toBe('/admin/backups/restore?async=true')
  })
})
