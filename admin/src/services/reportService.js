import api, { extractData } from './api';

const reportService = {
  sales: async (params = {}) => {
    const res = await api.get('/admin/reports/sales', { params });
    return extractData(res);
  },
  products: async () => {
    const res = await api.get('/admin/reports/products');
    return extractData(res);
  },
  customers: async () => {
    const res = await api.get('/admin/reports/customers');
    return extractData(res);
  },
};

export default reportService;
