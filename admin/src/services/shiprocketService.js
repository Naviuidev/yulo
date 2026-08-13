import api, { extractData } from './api';

const shiprocketService = {
  get: async () => {
    const res = await api.get('/admin/shiprocket');
    return extractData(res);
  },
  update: async (data) => {
    const res = await api.put('/admin/shiprocket', data);
    return extractData(res);
  },
  testConnection: async () => {
    const res = await api.post('/admin/shiprocket/test');
    return extractData(res);
  },
};

export default shiprocketService;
