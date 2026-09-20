import api from './api'

let categoriesCache = null
let categoriesPromise = null

export const productService = {
  // Public
  // Every method takes an optional trailing axios config so callers can pass
  // `{ signal }` from useApiQuery for cancellation. Previously none did, so a
  // navigation away mid-request leaked a live promise into setState.
  getAll: (params, config = {}) => api.get('/products', { params, ...config }),
  getById: (id, config = {}) => api.get(`/products/${id}`, config),
  getCategories: ({ force = false, signal } = {}) => {
    if (force) {
      categoriesCache = null
      categoriesPromise = null
    }

    if (categoriesCache) {
      return Promise.resolve({ data: { data: categoriesCache } })
    }

    if (!categoriesPromise) {
      categoriesPromise = api.get('/products/categories', { signal })
        .then((res) => {
          categoriesCache = res.data?.data || []
          return { ...res, data: { ...res.data, data: categoriesCache } }
        })
        .finally(() => {
          categoriesPromise = null
        })
    }

    return categoriesPromise
  },
  getSuggestions: (q, config = {}) =>
    api.get('/products/suggestions', { params: { q }, ...config }),
  getPriceHistory: (id, variety, packaging, config = {}) =>
    api.get(`/products/${id}/price-history`, { params: { variety, packaging }, ...config }),
  getBestTimeBadge: (id, variety, packaging, price, config = {}) =>
    api.get(`/products/${id}/best-time`, { params: { variety, packaging, price }, ...config }),
  getPriceChanges: (ids, config = {}) =>
    api.get('/products/price-changes', { params: { ids: ids.join(',') }, ...config }),
}
