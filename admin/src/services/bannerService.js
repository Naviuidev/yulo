import api, { extractData, extractPaginated } from './api';

const bannerService = {
  list: async (params = {}) => {
    const res = await api.get('/admin/banners', { params });
    return extractPaginated(res);
  },
  create: async (data) => {
    const res = await api.post('/admin/banners', data);
    return extractData(res);
  },
  update: async (id, data) => {
    const res = await api.put(`/admin/banners/${id}`, data);
    return extractData(res);
  },
  remove: async (id) => {
    const res = await api.delete(`/admin/banners/${id}`);
    return extractData(res);
  },
};

export default bannerService;
