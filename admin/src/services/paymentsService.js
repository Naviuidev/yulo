import api, { extractData } from './api';

const paymentsService = {
  getOverview: async () => {
    const res = await api.get('/admin/payments/overview');
    return extractData(res);
  },
  getCashfree: async () => {
    const res = await api.get('/admin/payments/cashfree');
    return extractData(res);
  },
  updateCashfree: async (data) => {
    const res = await api.put('/admin/payments/cashfree', data);
    return extractData(res);
  },
  getPhonePe: async () => {
    const res = await api.get('/admin/payments/phonepe');
    return extractData(res);
  },
  updatePhonePe: async (data) => {
    const res = await api.put('/admin/payments/phonepe', data);
    return extractData(res);
  },
  getPaytm: async () => {
    const res = await api.get('/admin/payments/paytm');
    return extractData(res);
  },
  updatePaytm: async (data) => {
    const res = await api.put('/admin/payments/paytm', data);
    return extractData(res);
  },
  testPaytm: async () => {
    const res = await api.post('/admin/payments/paytm/test', {});
    return extractData(res);
  },
  getRazorpay: async () => {
    const res = await api.get('/admin/payments/razorpay');
    return extractData(res);
  },
  updateRazorpay: async (data) => {
    const res = await api.put('/admin/payments/razorpay', data);
    return extractData(res);
  },
  testRazorpay: async () => {
    const res = await api.post('/admin/payments/razorpay/test', {});
    return extractData(res);
  },
  getPayU: async () => {
    const res = await api.get('/admin/payments/payu');
    return extractData(res);
  },
  updatePayU: async (data) => {
    const res = await api.put('/admin/payments/payu', data);
    return extractData(res);
  },
  testPayU: async () => {
    const res = await api.post('/admin/payments/payu/test', {});
    return extractData(res);
  },
  publish: async (gateway, unpublishCurrent = false) => {
    const res = await api.post('/admin/payments/publish', {
      gateway,
      unpublish_current: unpublishCurrent ? 1 : 0,
    });
    return extractData(res);
  },
  unpublish: async () => {
    const res = await api.post('/admin/payments/unpublish', {});
    return extractData(res);
  },
};

export default paymentsService;
