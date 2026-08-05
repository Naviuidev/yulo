import api from './api';

export const cartService = {
  getCart: () => api.get('/cart'),
  addItem: (data) => api.post('/cart', data),
  updateItem: (id, data) => api.put(`/cart/${id}`, data),
  removeItem: (id) => api.delete(`/cart/${id}`),
  clearCart: () => api.delete('/cart'),
};

export const wishlistService = {
  getWishlist: () => api.get('/wishlist'),
  addItem: (productId) => api.post('/wishlist', { product_id: productId }),
  toggleItem: (productId) => api.post('/wishlist/toggle', { product_id: productId }),
  removeItem: (id) => api.delete(`/wishlist/${id}`),
};

export const compareService = {
  getCompare: () => api.get('/compare'),
  addItem: (productId) => api.post('/compare', { product_id: productId }),
  removeItem: (id) => api.delete(`/compare/${id}`),
  clearCompare: () => api.delete('/compare'),
};
