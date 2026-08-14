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
};

export default reviewService;
