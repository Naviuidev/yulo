import api, { extractData } from './api';

const notificationService = {
  list: async () => {
    const res = await api.get('/admin/notifications');
    return extractData(res);
  },
  unreadCount: async () => {
    const res = await api.get('/admin/notifications/unread-count');
    return extractData(res);
  },
  markRead: async (key) => {
    const res = await api.post('/admin/notifications/mark-read', { key });
    return extractData(res);
  },
  markAllRead: async () => {
    const res = await api.post('/admin/notifications/read-all');
    return extractData(res);
  },
};

export default notificationService;
