import api, { extractData, extractPaginated } from './api';

const inventoryService = {
  list: async (params = {}) => {
    const res = await api.get('/admin/inventory', { params });
    return extractPaginated(res);
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
