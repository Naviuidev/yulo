import api, { extractData } from './api';

const whatsappService = {
  get: async () => {
    const res = await api.get('/admin/whatsapp');
    return extractData(res);
  },
  update: async (data) => {
    const res = await api.put('/admin/whatsapp', data);
    return extractData(res);
  },
};

export const footerSocialService = {
  get: async () => {
    const res = await api.get('/admin/footer-socials');
    return extractData(res);
  },
  update: async (items) => {
    const res = await api.put('/admin/footer-socials', { items });
    return extractData(res);
  },
};

export const instagramFeedService = {
  get: async () => {
    const res = await api.get('/admin/instagram-feed');
    return extractData(res);
  },
  update: async (data) => {
    const res = await api.put('/admin/instagram-feed', data);
    return extractData(res);
  },
  sync: async (data = {}) => {
    const res = await api.post('/admin/instagram-feed/sync', data);
    return extractData(res);
  },
};

export default whatsappService;
