import api from './api';

export const orderService = {
  getOrders: (params = {}) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  /** Create order + Cashfree session in one step (Pay Now). */
  checkoutCashfree: (data) => api.post('/checkout/cashfree', data),
  /** Create order + PhonePe redirect in one step (Pay Now). */
  checkoutPhonePe: (data) => api.post('/checkout/phonepe', data),
  /** Create order + Paytm JS Checkout token in one step (Pay Now). */
  checkoutPaytm: (data) => api.post('/checkout/paytm', data),
  /** Create order + Razorpay order in one step (Pay Now). */
  checkoutRazorpay: (data) => api.post('/checkout/razorpay', data),
  /** Create order + PayU Hosted Checkout form in one step (Pay Now). */
  checkoutPayU: (data) => api.post('/checkout/payu', data),
  /** Place Cash on Delivery order (when all cart products allow COD). */
  checkoutCod: (data) => api.post('/checkout/cod', data),
  cancelOrder: (id) => api.post(`/orders/${id}/cancel`),
  requestReturn: (id, data = {}) => api.post(`/orders/${id}/return`, data),
  sendHelp: (id, data) => api.post(`/orders/${id}/help`, data),
  getInvoice: (id) => api.get(`/orders/${id}/invoice`),
  trackOrder: (id) => api.get(`/orders/${id}/track`),
  getCheckoutSummary: () => api.get('/checkout/summary'),
};

export const couponService = {
  validate: (code, subtotal) => api.post('/coupons/validate', { code, subtotal }),
};

export const paymentService = {
  getActiveGateway: () => api.get('/payments/active-gateway'),
  initiatePhonePe: (orderId) => api.post('/payments/phonepe/initiate', { order_id: orderId }),
  verifyPhonePe: (orderId) => api.post('/payments/phonepe/verify', { order_id: orderId }),
  initiateCashfree: (orderId) => api.post('/payments/cashfree/initiate', { order_id: orderId }),
  verifyCashfree: (orderId) => api.post('/payments/cashfree/verify', { order_id: orderId }),
  initiatePaytm: (orderId) => api.post('/payments/paytm/initiate', { order_id: orderId }),
  verifyPaytm: (orderId) => api.post('/payments/paytm/verify', { order_id: orderId }),
  initiateRazorpay: (orderId) => api.post('/payments/razorpay/initiate', { order_id: orderId }),
  verifyRazorpay: (payload) => api.post('/payments/razorpay/verify', payload),
  initiatePayU: (orderId) => api.post('/payments/payu/initiate', { order_id: orderId }),
  verifyPayU: (orderId) => api.post('/payments/payu/verify', { order_id: orderId }),
};
