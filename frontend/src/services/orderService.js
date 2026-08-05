import api from './api';

export const orderService = {
  getOrders: (params = {}) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  cancelOrder: (id) => api.post(`/orders/${id}/cancel`),
  trackOrder: (id) => api.get(`/orders/${id}/track`),
  getCheckoutSummary: () => api.get('/checkout/summary'),
};

export const couponService = {
  validate: (code, subtotal) => api.post('/coupons/validate', { code, subtotal }),
};

export const paymentService = {
  initiatePhonePe: (orderId) => api.post('/payments/phonepe/initiate', { order_id: orderId }),
};
