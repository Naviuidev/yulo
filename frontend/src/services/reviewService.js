import api from './api';

export const reviewService = {
  getTestimonials: () => api.get('/reviews/testimonials', { params: { limit: 24 } }),
  getPurchasedProducts: () => api.get('/reviews/purchased-products'),
  submit: (formData) => api.post('/reviews', formData),
  getProductReviews: (productId, params = {}) =>
    api.get(`/products/${productId}/reviews`, { params }),
};

export default reviewService;
