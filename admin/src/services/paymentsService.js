import api, { extractData } from './api';

const paymentsService = {
  getCashfree: async () => {
    const res = await api.get('/admin/payments/cashfree');
    return extractData(res);
  },
  updateCashfree: async (data) => {
    const res = await api.put('/admin/payments/cashfree', data);
    return extractData(res);
  },
};

export default paymentsService;
