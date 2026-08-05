import api, { extractData, extractPaginated } from './api';

const blogService = {
  list: async (params = {}) => {
    const res = await api.get('/admin/blogs', { params });
    return extractPaginated(res);
  },
  create: async (data) => {
    const res = await api.post('/admin/blogs', data);
    return extractData(res);
  },
  update: async (id, data) => {
    const res = await api.put(`/admin/blogs/${id}`, data);
    return extractData(res);
  },
  remove: async (id) => {
    const res = await api.delete(`/admin/blogs/${id}`);
    return extractData(res);
  },
};

export default blogService;
