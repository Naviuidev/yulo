import api, { extractData } from './api';

const analyticsService = {
  overview: async (params = {}) => {
    const query = typeof params === 'number'
      ? { period: params }
      : {
          year: params.year,
          month: params.month,
        };
    const res = await api.get('/admin/analytics/overview', { params: query });
    return extractData(res);
  },
  traffic: async (params = {}) => {
    const query = {
      year: params.year,
      month: params.month,
    };
    const res = await api.get('/admin/analytics/traffic', { params: query });
    return extractData(res);
  },
};

export default analyticsService;
