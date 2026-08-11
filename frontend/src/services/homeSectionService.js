import api from './api';

export const homeSectionService = {
  getAll: async () => api.get('/home-sections'),

  getBySlug: async (slug) => {
    const res = await api.get('/home-sections');
    const rows = res.data?.data || [];
    const section = rows.find((row) => row.slug === slug) || null;
    return { data: { success: true, data: section } };
  },
};
