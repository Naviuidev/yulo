import api, { extractData } from './api';

const offerCardService = {
  get: async () => {
    const res = await api.get('/admin/offer-card');
    return extractData(res);
  },
  create: async (data) => {
    const res = await api.post('/admin/offer-card', data);
    return extractData(res);
  },
  update: async (id, data) => {
    const res = await api.put(`/admin/offer-card/${id}`, data);
    return extractData(res);
  },
  remove: async (id) => {
    const res = await api.delete(`/admin/offer-card/${id}`);
    return extractData(res);
  },
};

export default offerCardService;
