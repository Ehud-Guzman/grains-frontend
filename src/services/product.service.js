import api from './api'

let categoriesCache = null
let categoriesPromise = null

export const productService = {
  // Public
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getCategories: ({ force = false } = {}) => {
    if (force) {
      categoriesCache = null
      categoriesPromise = null
    }

    if (categoriesCache) {
      return Promise.resolve({ data: { data: categoriesCache } })
    }

    if (!categoriesPromise) {
      categoriesPromise = api.get('/products/categories')
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
  getSuggestions: (q) => api.get('/products/suggestions', { params: { q } })
}
