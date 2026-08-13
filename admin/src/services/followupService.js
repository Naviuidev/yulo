import api, { extractData, extractPaginated } from './api';

const followupService = {
  list: async (params = {}) => {
    const res = await api.get('/admin/followups', { params });
    return extractPaginated(res);
  },
  get: async (id) => {
    const res = await api.get(`/admin/followups/${id}`);
    return extractData(res);
  },
  shareResponse: async (id, data) => {
    const res = await api.post(`/admin/followups/${id}/share-response`, data);
    return extractData(res);
  },
};

export default followupService;
