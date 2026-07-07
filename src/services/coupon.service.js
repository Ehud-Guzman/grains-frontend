import api, { getShopBranchId } from './api';

export const couponService = {
  // Public — validate a coupon code before placing order. Must scope to the
  // resolved storefront branch (not the default branch) or a coupon valid at
  // the customer's actual branch reads as invalid, and vice versa.
  validate: (code, subtotal) => api.post('/coupons/validate', { code, subtotal, branchId: getShopBranchId() }),

  // Admin
  getAll:    ()        => api.get('/admin/coupons'),
  getPerformance: ()   => api.get('/admin/coupons/performance'),
  getById:   (id)      => api.get(`/admin/coupons/${id}`),
  create:    (data)    => api.post('/admin/coupons', data),
  update:    (id, data)=> api.put(`/admin/coupons/${id}`, data),
  remove:    (id)      => api.delete(`/admin/coupons/${id}`),
};
