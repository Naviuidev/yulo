import api, { extractData } from './api';

const analyticsService = {
  overview: async (period = 30) => {
    const res = await api.get('/admin/analytics/overview', { params: { period } });
    return extractData(res);
  },
  traffic: async () => {
    const res = await api.get('/admin/analytics/traffic');
    return extractData(res);
  },
};

export default analyticsService;
