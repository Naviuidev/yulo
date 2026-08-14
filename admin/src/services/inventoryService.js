import api, { extractData, extractPaginated } from './api';

const inventoryService = {
  list: async (params = {}) => {
    const res = await api.get('/admin/inventory', { params });
    const paginated = extractPaginated(res);
    return {
      ...paginated,
      summary: paginated.pagination?.summary || null,
      low_stock_threshold: paginated.pagination?.low_stock_threshold ?? 5,
    };
  },
  get: async (id) => {
    const res = await api.get(`/admin/inventory/${id}`);
    return extractData(res);
  },
  adjust: async (data) => {
    const res = await api.post('/admin/inventory/adjust', data);
    return extractData(res);
  },
  logs: async (params = {}) => {
    const res = await api.get('/admin/inventory/logs', { params });
    return extractPaginated(res);
  },
};

export default inventoryService;
