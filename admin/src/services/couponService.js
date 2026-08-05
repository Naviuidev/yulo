import api, { extractData, extractPaginated } from './api';

const couponService = {
  list: async (params = {}) => {
    const res = await api.get('/admin/coupons', { params });
    return extractPaginated(res);
  },
  create: async (data) => {
    const res = await api.post('/admin/coupons', data);
    return extractData(res);
  },
  update: async (id, data) => {
    const res = await api.put(`/admin/coupons/${id}`, data);
    return extractData(res);
  },
  remove: async (id) => {
    const res = await api.delete(`/admin/coupons/${id}`);
    return extractData(res);
  },
};

export default couponService;
