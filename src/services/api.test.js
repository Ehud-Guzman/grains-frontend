import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── axios test double ─────────────────────────────────────────────────────────
// api.js builds its own instance via axios.create() and then registers
// interceptors on it. This factory captures those handlers so the tests can
// invoke them directly and assert the refresh/retry semantics — the most
// intricate logic in the frontend, previously with zero coverage.
const interceptors = { request: null, response: null, responseError: null }
const instance = vi.fn()
const axiosMock = vi.fn()
// Captured at module load (before any clearAllMocks) so the instance-config
// assertion can't be wiped by an earlier beforeEach.
let createdWith = null

vi.mock('axios', () => ({
  default: Object.assign(axiosMock, {
    create: vi.fn((config) => {
      createdWith = config
      instance.interceptors = {
        request: { use: (onFulfilled) => { interceptors.request = onFulfilled } },
        response: {
          use: (onFulfilled, onRejected) => {
            interceptors.response = onFulfilled
            interceptors.responseError = onRejected
          },
        },
      }
      return instance
    }),
    post: vi.fn(),
  }),
}))

vi.mock('../utils/sentry', () => ({ captureException: vi.fn() }))

const { default: api, setToken, getToken, clearToken, setShopBranchId } =
  await import('./api')

/** Build a rejected axios error carrying a response. */
const httpError = (status, url) =>
  Object.assign(new Error(`HTTP ${status}`), {
    config: { url, method: 'get', headers: {} },
    response: { status, data: { message: 'nope' } },
  })

const okResponse = (url, data = {}) => ({
  data,
  config: { url, method: 'get', headers: {} },
})

describe('api — request interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearToken()
    setShopBranchId(null)
  })

  it('attaches the in-memory access token as a Bearer header', () => {
    setToken('tok-123')
    const config = interceptors.request({ headers: {} })
    expect(config.headers.Authorization).toBe('Bearer tok-123')
  })

  it('omits the Authorization header when there is no token', () => {
    const config = interceptors.request({ headers: {} })
    expect(config.headers.Authorization).toBeUndefined()
  })

  it('drops Content-Type for FormData so the browser sets the multipart boundary', () => {
    const config = interceptors.request({
      headers: { 'Content-Type': 'application/json' },
      data: new FormData(),
    })
    expect(config.headers['Content-Type']).toBeUndefined()
  })

  it('scopes public shop GETs to the resolved branch', () => {
    setShopBranchId('branch-1')
    const config = interceptors.request({ url: '/products', method: 'get', headers: {} })
    expect(config.params.branchId).toBe('branch-1')
  })

  it('never overrides an explicitly supplied branchId', () => {
    setShopBranchId('branch-1')
    const config = interceptors.request({
      url: '/products',
      method: 'get',
      headers: {},
      params: { branchId: 'branch-2' },
    })
    expect(config.params.branchId).toBe('branch-2')
  })


describe('api — 401 refresh flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearToken()
    setShopBranchId(null)
  })

  it('refreshes once and retries the original request', async () => {
    axiosMock.post.mockResolvedValue({
      data: { data: { accessToken: 'fresh', user: { _id: 'u1', role: 'customer' } } },
    })
    instance.mockResolvedValue(okResponse('/orders', { data: [] }))

    const result = await interceptors.responseError(httpError(401, '/orders'))

    expect(axiosMock.post).toHaveBeenCalledTimes(1)
    expect(axiosMock.post.mock.calls[0][0]).toContain('/auth/refresh')
    expect(getToken()).toBe('fresh')
    expect(result.data).toEqual({ data: [] })
  })

  it('does NOT attempt a refresh for the auth endpoints themselves', async () => {
    // A 401 from /auth/login is "wrong password" — refreshing would turn a clear
    // validation error into a confusing session reset.
    const paths = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/select-branch', '/auth/logout']
    for (const path of paths) {
      await expect(interceptors.responseError(httpError(401, path))).rejects.toThrow()
      expect(axiosMock.post).not.toHaveBeenCalled()
    }
  })

  it('shares a single refresh across concurrent 401s (no refresh stampede)', async () => {
    let releaseRefresh
    axiosMock.post.mockImplementation(
      () => new Promise((resolve) => {
        releaseRefresh = () => resolve({ data: { data: { accessToken: 'shared', user: null } } })
      }),
    )
    instance.mockResolvedValue(okResponse('/x', { data: 'ok' }))

    // Three separate request configs, so the per-request _retry flag differs.
    const first = interceptors.responseError(httpError(401, '/orders'))
    const second = interceptors.responseError(httpError(401, '/products'))
    const third = interceptors.responseError(httpError(401, '/alerts'))

    releaseRefresh()
    await Promise.all([first, second, third])

    expect(axiosMock.post).toHaveBeenCalledTimes(1)
    expect(getToken()).toBe('shared')
  })

  it('does not retry the same request twice', async () => {
    axiosMock.post.mockResolvedValue({ data: { data: { accessToken: 'fresh', user: null } } })
    instance.mockRejectedValue(httpError(401, '/orders'))

    await expect(interceptors.responseError(httpError(401, '/orders'))).rejects.toThrow()

    expect(axiosMock.post).toHaveBeenCalledTimes(1)
  })

  it('keeps the session when the refresh fails for a non-auth reason (cold start / network)', async () => {
    const networkError = Object.assign(new Error('timeout'), { config: {}, response: undefined })
    axiosMock.post.mockRejectedValue(networkError)
    localStorage.setItem('user', JSON.stringify({ _id: 'u1' }))

    await expect(interceptors.responseError(httpError(401, '/orders'))).rejects.toThrow()

    // A Render cold start must not log the user out.
    expect(localStorage.getItem('user')).not.toBeNull()
  })

  it('clears the session and notifies listeners when the refresh is genuinely rejected', async () => {
    axiosMock.post.mockRejectedValue(httpError(401, '/auth/refresh'))
    localStorage.setItem('user', JSON.stringify({ _id: 'u1' }))
    localStorage.setItem('currentBranch', JSON.stringify({ _id: 'b1' }))

    const onExpired = vi.fn()
    window.addEventListener('auth:session-expired', onExpired)

    await expect(interceptors.responseError(httpError(401, '/orders'))).rejects.toThrow()

    expect(localStorage.getItem('user')).toBeNull()
    expect(localStorage.getItem('currentBranch')).toBeNull()
    // AuthContext listens for this so ProtectedRoute can redirect with state.from
    // (letting the user come back to the page they were on after signing in).
    expect(onExpired).toHaveBeenCalledTimes(1)

    window.removeEventListener('auth:session-expired', onExpired)
  })
})

describe('api — Sentry reporting scope', () => {
  beforeEach(() => vi.clearAllMocks())

  it('leaves routine 4xx alone', async () => {
    const { captureException } = await import('../utils/sentry')
    await expect(interceptors.responseError(httpError(400, '/products'))).rejects.toThrow()
    expect(captureException).not.toHaveBeenCalled()
  })

  it('reports 5xx', async () => {
    const { captureException } = await import('../utils/sentry')
    await expect(interceptors.responseError(httpError(500, '/products'))).rejects.toThrow()
    expect(captureException).toHaveBeenCalled()
  })

  it('reports a request that never got a response (network / timeout)', async () => {
    const { captureException } = await import('../utils/sentry')
    const networkError = Object.assign(new Error('offline'), { config: { url: '/products' } })
    await expect(interceptors.responseError(networkError)).rejects.toThrow()
    expect(captureException).toHaveBeenCalled()
  })
})

describe('api — instance configuration', () => {
  it('is created with credentials so the HttpOnly refresh cookie is sent', () => {
    expect(createdWith.withCredentials).toBe(true)
  })

  it('exports the api instance as the module default', () => {
    expect(api).toBe(instance)
  })
})

  it('does not add a branchId to admin or auth endpoints', () => {
    setShopBranchId('branch-1')
    for (const url of ['/admin/orders', '/auth/login', '/orders/my']) {
      const config = interceptors.request({ url, method: 'get', headers: {} })
      expect(config.params?.branchId).toBeUndefined()
    }
  })

  it('does not add a branchId to non-GET requests', () => {
    setShopBranchId('branch-1')
    const config = interceptors.request({ url: '/products', method: 'post', headers: {} })
    expect(config.params?.branchId).toBeUndefined()
  })
})
