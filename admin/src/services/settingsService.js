import api, { extractData } from './api';

const settingsService = {
  get: async () => {
    const res = await api.get('/admin/settings');
    return extractData(res);
  },
  update: async (data) => {
    const res = await api.put('/admin/settings', data);
    return extractData(res);
  },
};

export default settingsService;
