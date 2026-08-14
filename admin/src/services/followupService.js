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
  remove: async (id) => {
    const res = await api.delete(`/admin/followups/${id}`);
    return extractData(res);
  },
};

export const contactMessageService = {
  list: async (params = {}) => {
    const res = await api.get('/admin/contact-messages', { params });
    return extractPaginated(res);
  },
  updateStatus: async (id, status) => {
    const res = await api.patch(`/admin/contact-messages/${id}/status`, { status });
    return extractData(res);
  },
  remove: async (id) => {
    const res = await api.delete(`/admin/contact-messages/${id}`);
    return extractData(res);
  },
};

export default followupService;
