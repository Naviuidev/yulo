import api, { extractData } from './api';

const dashboardService = {
  getStats: async () => {
    const res = await api.get('/admin/dashboard');
    return extractData(res);
  },
};

export default dashboardService;
