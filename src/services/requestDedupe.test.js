import { describe, it, expect, vi } from 'vitest'
import { createDedupingAdapter, installRequestDedupe } from './requestDedupe'

const deferred = () => {
  let resolve; let reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}
const ok = (data = { n: 1 }) => ({ data, status: 200, headers: {}, config: {} })
const get = (url, extra = {}) => ({ method: 'get', url, params: undefined, headers: {}, ...extra })

describe('createDedupingAdapter', () => {
  it('identical GETs in flight share ONE request, and each caller gets its own copy of the data', async () => {
    const d = deferred()
    const base = vi.fn(() => d.promise)
    const adapter = createDedupingAdapter(base)
    const a = adapter(get('/products/abc'))
    const b = adapter(get('/products/abc'))
    d.resolve(ok({ list: [1, 2, 3] }))
    const [ra, rb] = await Promise.all([a, b])
    expect(base).toHaveBeenCalledTimes(1)
    expect(ra.data).toEqual({ list: [1, 2, 3] })
    expect(rb.data).toEqual({ list: [1, 2, 3] })
    rb.data.list.push(99)
    expect(ra.data.list).toEqual([1, 2, 3])        // mutating one caller's copy never leaks into another's
  })

  it('different URLs, params or credentials are different requests', async () => {
    const base = vi.fn(async () => ok())
    const adapter = createDedupingAdapter(base)
    await Promise.all([
      adapter(get('/products', { params: { page: 1 } })),
      adapter(get('/products', { params: { page: 2 } })),
      adapter(get('/products', { params: { page: 1 }, headers: { Authorization: 'Bearer x' } })),
    ])
    expect(base).toHaveBeenCalledTimes(3)
  })

  it('remembers the slow-changing public answers briefly, then asks again', async () => {
    let t = 1000
    const base = vi.fn(async () => ok({ shopName: 'Shop' }))
    const adapter = createDedupingAdapter(base, { ttlMs: 5000, now: () => t })
    await adapter(get('/settings'))
    t += 4000
    expect((await adapter(get('/settings'))).data).toEqual({ shopName: 'Shop' })
    expect(base).toHaveBeenCalledTimes(1)
    t += 2000
    await adapter(get('/settings'))
    expect(base).toHaveBeenCalledTimes(2)
  })

  it('products are NOT remembered (stock must be fresh) - only shared while in flight', async () => {
    const base = vi.fn(async () => ok())
    const adapter = createDedupingAdapter(base)
    await adapter(get('/products'))
    await adapter(get('/products'))
    expect(base).toHaveBeenCalledTimes(2)
  })

  it('a write forgets what was remembered, so a saved setting shows at once', async () => {
    const base = vi.fn(async () => ok())
    const adapter = createDedupingAdapter(base)
    await adapter(get('/settings'))
    await adapter({ method: 'put', url: '/admin/settings', headers: {} })
    await adapter(get('/settings'))
    expect(base).toHaveBeenCalledTimes(3)
  })

  it('noCache bypasses everything', async () => {
    const base = vi.fn(async () => ok())
    const adapter = createDedupingAdapter(base)
    await Promise.all([adapter(get('/settings', { noCache: true })), adapter(get('/settings', { noCache: true }))])
    expect(base).toHaveBeenCalledTimes(2)
  })

  it('a failed shared request is not shared: each follower makes its own (so per-request 401 handling still works)', async () => {
    const d = deferred()
    const base = vi.fn()
      .mockImplementationOnce(() => d.promise)
      .mockResolvedValue(ok({ retried: true }))
    const adapter = createDedupingAdapter(base)
    const a = adapter(get('/products/abc'))
    const b = adapter(get('/products/abc'))
    d.reject(Object.assign(new Error('boom'), { response: { status: 500 } }))
    await expect(a).rejects.toThrow('boom')          // the leader sees its own error
    expect((await b).data).toEqual({ retried: true }) // the follower retried independently
    expect(base).toHaveBeenCalledTimes(2)
  })

  it('a follower that is aborted rejects as cancelled without cancelling the leader', async () => {
    const d = deferred()
    const base = vi.fn(() => d.promise)
    const adapter = createDedupingAdapter(base)
    const controller = new AbortController()
    const leader = adapter(get('/products/abc'))
    const follower = adapter(get('/products/abc', { signal: controller.signal }))
    controller.abort()
    await expect(follower).rejects.toMatchObject({ code: 'ERR_CANCELED' })
    d.resolve(ok())
    await expect(leader).resolves.toMatchObject({ status: 200 })
  })

  it('blob downloads are never shared or copied', async () => {
    const base = vi.fn(async () => ok(new Blob(['x'])))
    const adapter = createDedupingAdapter(base)
    await adapter(get('/admin/backups/1/download', { responseType: 'blob' }))
    await adapter(get('/admin/backups/1/download', { responseType: 'blob' }))
    expect(base).toHaveBeenCalledTimes(2)
  })
})

describe('installRequestDedupe', () => {
  it('replaces the instance adapter, and quietly does nothing for a test double without one', () => {
    const base = vi.fn()
    const instance = { defaults: { adapter: ['xhr'] } }
    const axiosLib = { getAdapter: vi.fn(() => base), CanceledError: class extends Error {} }
    expect(installRequestDedupe(instance, axiosLib)).toBeTypeOf('function')
    expect(instance.defaults.adapter).toBeTypeOf('function')
    expect(installRequestDedupe({}, axiosLib)).toBeNull()
    expect(installRequestDedupe(instance, {})).toBeNull()
  })
})
