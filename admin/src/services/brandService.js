import api, { extractData, extractPaginated } from './api';

const brandService = {
  list: async (params = {}) => {
    const res = await api.get('/admin/brands', { params });
    return extractPaginated(res);
  },
  create: async (data) => {
    const res = await api.post('/admin/brands', data);
    return extractData(res);
  },
  update: async (id, data) => {
    const res = await api.put(`/admin/brands/${id}`, data);
    return extractData(res);
  },
  remove: async (id) => {
    const res = await api.delete(`/admin/brands/${id}`);
    return extractData(res);
  },
};

export default brandService;
