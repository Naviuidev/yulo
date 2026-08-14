import api, { extractData, extractPaginated } from './api';

const featuredCollectionService = {
  list: async () => {
    const res = await api.get('/admin/featured-collections');
    return extractPaginated(res);
  },
  create: async (data) => {
    const res = await api.post('/admin/featured-collections', data);
    return extractData(res);
  },
  update: async (id, data) => {
    const res = await api.put(`/admin/featured-collections/${id}`, data);
    return extractData(res);
  },
  remove: async (id) => {
    const res = await api.delete(`/admin/featured-collections/${id}`);
    return extractData(res);
  },
  uploadImage: async (file) => {
    const form = new FormData();
    form.append('image', file);
    const res = await api.post('/admin/featured-collections/upload-image', form, {
      headers: { 'Content-Type': undefined },
    });
    return extractData(res);
  },
};

export default featuredCollectionService;
