import api, { extractData, extractPaginated } from './api';

const marketingService = {
  users: async (params = {}) => extractPaginated(await api.get('/admin/marketing/users', { params })),
  subscribers: async (params = {}) =>
    extractPaginated(await api.get('/admin/marketing/subscribers', { params })),
  campaigns: async (params = {}) =>
    extractPaginated(await api.get('/admin/marketing/campaigns', { params })),
  audience: async (type) =>
    extractData(await api.get('/admin/marketing/audience', { params: { type } })),
  uploadBanner: async (file) => {
    const form = new FormData();
    form.append('image', file);
    return extractData(await api.post('/admin/marketing/upload-banner', form));
  },
  sendPromotion: async (payload) =>
    extractData(await api.post('/admin/marketing/send-promotion', payload)),
  requestFeature: async (payload) =>
    extractData(await api.post('/admin/marketing/feature-request', payload)),
};

export default marketingService;
