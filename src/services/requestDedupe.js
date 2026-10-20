// Shares identical in-flight GET requests, and keeps a few slow-changing public answers for a short while.
//
// 2026-10 audit (F-03): a single page view fired 8-10 API calls, with duplicates - the shop settings twice,
// categories twice, the same product twice - because several components (and a branch-change re-fetch) ask
// for the same thing independently, and every call costs about a second end to end. This sits in axios'
// adapter slot, below the interceptors, so no call site has to change:
//   * identical GETs issued while one is already in flight share that single request;
//   * the handful of public, rarely-changing endpoints below are also remembered for TTL ms;
//   * any write (POST/PUT/PATCH/DELETE) forgets the remembered answers, so an admin saving settings sees
//     them straight away;
//   * `noCache: true` on a request config opts out entirely (the cart's price refresh uses it);
//   * a failed shared request is NOT shared with the followers - each re-issues its own, so per-request
//     error handling (the 401 refresh-and-retry in api.js) still works for every caller.
const REMEMBERED = [/^\/settings\/?$/, /^\/branches\/?$/, /^\/products\/categories\/?$/, /^\/promotions\/?$/];
const DEFAULT_TTL_MS = 20 * 1000;

const pathOf = (url = '') => String(url).split('?')[0];

const keyOf = (config) =>
  [config.method, config.baseURL || '', config.url || '', JSON.stringify(config.params || null), config.headers?.Authorization || ''].join('|');

// Callers own what they receive; never hand two of them the same object.
const copyOf = (response) => {
  let data = response.data;
  try { data = typeof structuredClone === 'function' ? structuredClone(response.data) : JSON.parse(JSON.stringify(response.data)); } catch { /* non-cloneable (blob/stream): share */ }
  return { ...response, data };
};

export function createDedupingAdapter(baseAdapter, { ttlMs = DEFAULT_TTL_MS, now = Date.now, canceledError } = {}) {
  const inflight = new Map();
  const remembered = new Map();

  const forget = () => remembered.clear();

  const adapter = (config) => {
    const method = String(config.method || 'get').toLowerCase();
    if (method !== 'get') {
      forget();
      return baseAdapter(config);
    }
    if (config.noCache || config.responseType === 'blob' || config.responseType === 'stream') return baseAdapter(config);

    const key = keyOf({ ...config, method });
    const keep = REMEMBERED.some((re) => re.test(pathOf(config.url)));

    if (keep) {
      const hit = remembered.get(key);
      if (hit && hit.expires > now()) return Promise.resolve(copyOf(hit.response));
    }

    const running = inflight.get(key);
    if (running) {
      return new Promise((resolve, reject) => {
        const signal = config.signal;
        if (signal) {
          const onAbort = () => reject(canceledError ? canceledError() : Object.assign(new Error('canceled'), { name: 'CanceledError', code: 'ERR_CANCELED', __CANCEL__: true }));
          if (signal.aborted) return onAbort();
          signal.addEventListener('abort', onAbort, { once: true });
        }
        running.then(
          (response) => resolve(copyOf(response)),
          () => baseAdapter(config).then(resolve, reject) // the shared request failed: make our own
        );
      });
    }

    const request = baseAdapter(config);
    inflight.set(key, request);
    const settle = () => { if (inflight.get(key) === request) inflight.delete(key); };
    request.then((response) => {
      settle();
      if (keep) remembered.set(key, { response: copyOf(response), expires: now() + ttlMs });
    }, settle);
    return request;
  };

  adapter.forget = forget;
  return adapter;
}

// Wrap an axios instance's adapter. A no-op where the instance cannot be adapted (e.g. test doubles).
export function installRequestDedupe(instance, axiosLib, options) {
  if (!instance?.defaults || typeof axiosLib?.getAdapter !== 'function') return null;
  try {
    const base = axiosLib.getAdapter(instance.defaults.adapter);
    const adapter = createDedupingAdapter(base, { canceledError: () => new axiosLib.CanceledError('canceled'), ...options });
    instance.defaults.adapter = adapter;
    return adapter;
  } catch {
    return null;
  }
}
