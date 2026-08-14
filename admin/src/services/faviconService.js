import api, { extractData } from './api';

const faviconService = {
  get: async () => extractData(await api.get('/admin/favicon')),
  save: async (url) => extractData(await api.put('/admin/favicon', { url })),
  publish: async () => extractData(await api.post('/admin/favicon/publish')),
  remove: async () => extractData(await api.delete('/admin/favicon')),
  uploadImage: async (file) => {
    const form = new FormData();
    form.append('image', file);
    const res = await api.post('/admin/favicon/upload-image', form, {
      headers: { 'Content-Type': undefined },
    });
    return extractData(res);
  },
};

export default faviconService;
