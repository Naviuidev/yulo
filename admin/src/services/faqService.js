import api, { extractData, extractPaginated } from './api';

const faqService = {
  list: async (params = {}) => {
    const res = await api.get('/admin/faqs', { params });
    return extractPaginated(res);
  },
  create: async (data) => {
    const res = await api.post('/admin/faqs', data);
    return extractData(res);
  },
  update: async (id, data) => {
    const res = await api.put(`/admin/faqs/${id}`, data);
    return extractData(res);
  },
  remove: async (id) => {
    const res = await api.delete(`/admin/faqs/${id}`);
    return extractData(res);
  },
};

export default faqService;
