import api, { extractData, extractPaginated } from './api';

const offerStripService = {
  list: async (params = {}) => {
    const res = await api.get('/admin/offer-strips', { params });
    return extractPaginated(res);
  },
  create: async (data) => {
    const res = await api.post('/admin/offer-strips', data);
    return extractData(res);
  },
  update: async (id, data) => {
    const res = await api.put(`/admin/offer-strips/${id}`, data);
    return extractData(res);
  },
  remove: async (id) => {
    const res = await api.delete(`/admin/offer-strips/${id}`);
    return extractData(res);
  },
};

export default offerStripService;
