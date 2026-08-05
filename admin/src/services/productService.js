import api, { extractData, extractPaginated } from './api';

const productService = {
  list: async (params = {}) => {
    const res = await api.get('/admin/products', { params });
    return extractPaginated(res);
  },
  get: async (id) => {
    const res = await api.get(`/admin/products/${id}`);
    return extractData(res);
  },
  create: async (data) => {
    const res = await api.post('/admin/products', data);
    return extractData(res);
  },
  update: async (id, data) => {
    const res = await api.put(`/admin/products/${id}`, data);
    return extractData(res);
  },
  remove: async (id) => {
    const res = await api.delete(`/admin/products/${id}`);
    return extractData(res);
  },
};

export default productService;
