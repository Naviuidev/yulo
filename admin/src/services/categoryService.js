import api, { extractData, extractPaginated } from './api';

const categoryService = {
  list: async (params = {}) => {
    const res = await api.get('/admin/categories', { params });
    return extractPaginated(res);
  },
  create: async (data) => {
    const res = await api.post('/admin/categories', data);
    return extractData(res);
  },
  update: async (id, data) => {
    const res = await api.put(`/admin/categories/${id}`, data);
    return extractData(res);
  },
  remove: async (id) => {
    const res = await api.delete(`/admin/categories/${id}`);
    return extractData(res);
  },
};

export default categoryService;
