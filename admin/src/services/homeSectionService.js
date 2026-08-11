import api, { extractData, extractPaginated } from './api';

const homeSectionService = {
  list: async () => {
    const res = await api.get('/admin/home-sections');
    return extractPaginated(res);
  },
  create: async (data) => {
    const res = await api.post('/admin/home-sections', data);
    return extractData(res);
  },
  update: async (id, data) => {
    const res = await api.put(`/admin/home-sections/${id}`, data);
    return extractData(res);
  },
  updateSalesConfig: async (data) => {
    const res = await api.put('/admin/home-sections/flash-sale/sales-config', data);
    return extractData(res);
  },
  clearSalesConfig: async () => {
    const res = await api.delete('/admin/home-sections/flash-sale/sales-config');
    return extractData(res);
  },
  remove: async (id) => {
    const res = await api.delete(`/admin/home-sections/${id}`);
    return extractData(res);
  },
};

export default homeSectionService;
