import api, { extractData, extractPaginated } from './api';

const orderService = {
  list: async (params = {}) => {
    const res = await api.get('/admin/orders', { params });
    return extractPaginated(res);
  },
  get: async (id) => {
    const res = await api.get(`/admin/orders/${id}`);
    return extractData(res);
  },
  updateStatus: async (id, status) => {
    const res = await api.patch(`/admin/orders/${id}/status`, { status });
    return extractData(res);
  },
};

export default orderService;
