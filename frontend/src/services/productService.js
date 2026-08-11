import api from './api';
import { MOCK_PRODUCTS } from '../utils/constants';
import { buildQueryString } from '../utils/helpers';

export const productService = {
  getProducts: async (params = {}) => {
    try {
      return await api.get(`/products${buildQueryString(params)}`);
    } catch {
      // Homepage curated queries must not fall back to mock catalog products.
      if (params.section || params.featured) {
        return {
          data: {
            success: true,
            data: [],
            pagination: { total: 0, page: 1, per_page: Number(params.per_page) || 12, total_pages: 0 },
          },
        };
      }
      return {
        data: {
          success: true,
          data: MOCK_PRODUCTS,
          pagination: { total: MOCK_PRODUCTS.length, page: 1, per_page: 12, total_pages: 1 },
        },
      };
    }
  },

  getFilters: async () => {
    try {
      return await api.get('/products/filters');
    } catch {
      return { data: { success: true, data: {} } };
    }
  },

  searchProducts: (q) => api.get(`/products/search?q=${encodeURIComponent(q)}`),

  getProduct: async (slug) => {
    try {
      return await api.get(`/products/${slug}`);
    } catch {
      const product = MOCK_PRODUCTS.find((p) => p.slug === slug) ?? MOCK_PRODUCTS[0];
      return {
        data: {
          success: true,
          data: {
            ...product,
            description:
              'Crafted with premium materials for a refined silhouette. Designed for those who appreciate understated luxury.',
            images: [{ image_path: product.primary_image, is_primary: 1 }],
            variants: [
              { id: 1, size: 'S', color: 'Black', stock: 10 },
              { id: 2, size: 'M', color: 'Black', stock: 15 },
              { id: 3, size: 'L', color: 'Black', stock: 8 },
            ],
          },
        },
      };
    }
  },

  getRelated: async (slug) => {
    try {
      return await api.get(`/products/${slug}/related`);
    } catch {
      return { data: { success: true, data: MOCK_PRODUCTS.slice(0, 4) } };
    }
  },

  getFrequentlyBought: async (slug) => {
    try {
      return await api.get(`/products/${slug}/frequently-bought`);
    } catch {
      return { data: { success: true, data: MOCK_PRODUCTS.slice(2, 5) } };
    }
  },

  getReviews: (productId) => api.get(`/products/${productId}/reviews`),
};

export const categoryService = {
  getCategories: async () => {
    try {
      return await api.get('/categories');
    } catch {
      const { MOCK_CATEGORIES } = await import('../utils/constants');
      return { data: { success: true, data: MOCK_CATEGORIES } };
    }
  },
  getCategory: (slug) => api.get(`/categories/${slug}`),
};

export const brandService = {
  getBrands: async () => {
    try {
      return await api.get('/brands');
    } catch {
      const { MOCK_BRANDS } = await import('../utils/constants');
      return { data: { success: true, data: MOCK_BRANDS } };
    }
  },
  getBrand: (slug) => api.get(`/brands/${slug}`),
};
