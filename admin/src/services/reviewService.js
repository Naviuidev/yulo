import api, { extractData, extractPaginated } from './api';

const reviewService = {
  list: async (params = {}) => {
    const res = await api.get('/admin/reviews', { params });
    return extractPaginated(res);
  },
  updateStatus: async (id, status) => {
    const res = await api.patch(`/admin/reviews/${id}/status`, { status });
    return extractData(res);
  },
  /** Admin dump / static review (no purchase required). */
  createStatic: async (payload) => {
    const isForm = typeof FormData !== 'undefined' && payload instanceof FormData;
    const res = await api.post('/admin/reviews', payload, isForm
      ? { headers: { 'Content-Type': undefined } }
      : undefined);
    return extractData(res);
  },
};

export default reviewService;
