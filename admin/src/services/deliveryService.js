import api, { extractData, extractPaginated } from './api';

const deliveryService = {
  list: async (params = {}) => {
    const res = await api.get('/admin/deliveries', { params });
    return extractPaginated(res);
  },
  create: async (data) => {
    const res = await api.post('/admin/deliveries', data);
    return extractData(res);
  },
  update: async (id, data) => {
    const res = await api.put(`/admin/deliveries/${id}`, data);
    return extractData(res);
  },
};

export default deliveryService;
