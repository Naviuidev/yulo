import api, { extractData, extractPaginated } from './api';

const orderService = {
  list: async (params = {}) => {
    const res = await api.get('/admin/orders', { params });
    return extractPaginated(res);
  },
  get: async (id) => {
    const res = await api.get(`/admin/orders/${id}`);
    return extractData(res);
  },
  updateStatus: async (id, status, options = {}) => {
    const res = await api.patch(`/admin/orders/${id}/status`, {
      status,
      notify_customer: Boolean(options.notify_customer),
    });
    return extractData(res);
  },
  shareTracking: async (id, data) => {
    const res = await api.post(`/admin/orders/${id}/share-tracking`, data);
    return extractData(res);
  },
};

export default orderService;
