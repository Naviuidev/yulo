import api, { extractData, extractPaginated } from './api';

const customerService = {
  list: async (params = {}) => {
    const res = await api.get('/admin/customers', { params });
    return extractPaginated(res);
  },
  get: async (id) => {
    const res = await api.get(`/admin/customers/${id}`);
    return extractData(res);
  },
  updateStatus: async (id, status) => {
    const res = await api.patch(`/admin/customers/${id}/status`, { status });
    return extractData(res);
  },
};

export default customerService;
