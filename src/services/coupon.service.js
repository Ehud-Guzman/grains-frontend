import api from './api';

export const couponService = {
  // Public — validate a coupon code before placing order
  validate: (code, subtotal) => api.post('/coupons/validate', { code, subtotal }),

  // Admin
  getAll:    ()        => api.get('/admin/coupons'),
  getPerformance: ()   => api.get('/admin/coupons/performance'),
  getById:   (id)      => api.get(`/admin/coupons/${id}`),
  create:    (data)    => api.post('/admin/coupons', data),
  update:    (id, data)=> api.put(`/admin/coupons/${id}`, data),
  remove:    (id)      => api.delete(`/admin/coupons/${id}`),
};
