import api from './api';
import { MOCK_BLOGS, MOCK_FAQS } from '../utils/constants';

export const blogService = {
  getBlogs: async (params = {}) => {
    try {
      return await api.get('/blogs', { params });
    } catch {
      return { data: { success: true, data: MOCK_BLOGS } };
    }
  },
  getBlog: async (slug) => {
    try {
      return await api.get(`/blogs/${slug}`);
    } catch {
      const blog = MOCK_BLOGS.find((b) => b.slug === slug) ?? MOCK_BLOGS[0];
      return {
        data: {
          success: true,
          data: {
            ...blog,
            content: `<p>${blog.excerpt}</p><p>Explore the world of YULO fashion with our curated editorial content.</p>`,
          },
        },
      };
    }
  },
};

export const faqService = {
  getFaqs: async () => {
    try {
      return await api.get('/faqs');
    } catch {
      return { data: { success: true, data: MOCK_FAQS } };
    }
  },
};

export const contactService = {
  submit: (data) => api.post('/contact', data),
};

export const newsletterService = {
  subscribe: (email) => api.post('/newsletter/subscribe', { email }),
  unsubscribe: (email) => api.post('/newsletter/unsubscribe', { email }),
};

export const cmsService = {
  getPage: (slug) => api.get(`/cms/${slug}`),
};

export const settingsService = {
  getPublic: () => api.get('/settings'),
};

export const reviewService = {
  submit: (data) => api.post('/reviews', data),
};

export const addressService = {
  getAddresses: () => api.get('/addresses'),
  createAddress: (data) => api.post('/addresses', data),
  updateAddress: (id, data) => api.put(`/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/addresses/${id}`),
};

export const profileService = {
  getProfile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/profile', data),
};
