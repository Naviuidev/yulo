import api from './api';

export const orderService = {
  getOrders: (params = {}) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  /** Create order + Cashfree session in one step (Pay Now). */
  checkoutCashfree: (data) => api.post('/checkout/cashfree', data),
  cancelOrder: (id) => api.post(`/orders/${id}/cancel`),
  trackOrder: (id) => api.get(`/orders/${id}/track`),
  getCheckoutSummary: () => api.get('/checkout/summary'),
};

export const couponService = {
  validate: (code, subtotal) => api.post('/coupons/validate', { code, subtotal }),
};

export const paymentService = {
  initiatePhonePe: (orderId) => api.post('/payments/phonepe/initiate', { order_id: orderId }),
  initiateCashfree: (orderId) => api.post('/payments/cashfree/initiate', { order_id: orderId }),
  verifyCashfree: (orderId) => api.post('/payments/cashfree/verify', { order_id: orderId }),
};
