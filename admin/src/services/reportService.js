import api, { extractData } from './api';

const reportService = {
  sales: async (params = {}) => {
    const res = await api.get('/admin/reports/sales', { params });
    return extractData(res);
  },
  products: async (params = {}) => {
    const res = await api.get('/admin/reports/products', { params });
    return extractData(res);
  },
  customers: async (params = {}) => {
    const res = await api.get('/admin/reports/customers', { params });
    return extractData(res);
  },
};

/** Normalize report payloads for callers that expect a row array. */
export function reportRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export default reportService;
