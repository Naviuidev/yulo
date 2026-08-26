import { PLACEHOLDER_IMAGES } from './constants';

export function getProductImage(product, index = 0) {
  const images = getProductImages(product, index);
  return images[0];
}

/** Raw image path/URL from a product or cart line (before resolveMediaUrl). */
export function getProductImagePath(product) {
  if (!product) return null;

  const candidates = [
    product.primary_image,
    product.image,
    product.image_path,
    product.product_image,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  const first = Array.isArray(product.images) ? product.images[0] : null;
  if (typeof first === 'string' && first.trim() !== '') {
    return first.trim();
  }
  if (first && typeof first === 'object') {
    const path = first.image_path || first.url || first.path || '';
    if (typeof path === 'string' && path.trim() !== '') {
      return path.trim();
    }
  }

  return null;
}

/** Up to 3 resolved image URLs for product cards / galleries. */
export function getProductImages(product, index = 0) {
  if (!product) {
    return [PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length]];
  }

  const fromGallery = (product.images || [])
    .map((img) => (typeof img === 'string' ? img : img?.image_path || img?.url || ''))
    .filter(Boolean)
    .slice(0, 3)
    .map((path) => resolveMediaUrl(path));

  if (fromGallery.length) return fromGallery;

  const single =
    getProductImagePath(product) ||
    PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];

  return [resolveMediaUrl(single)];
}

export function getApiData(response) {
  return response?.data?.data ?? response?.data ?? null;
}

export function getApiMessage(response) {
  return response?.data?.message ?? 'Something went wrong';
}

export function getPagination(response) {
  return response?.data?.pagination ?? null;
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(text, length = 120) {
  if (!text) return '';
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function getStoredJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setStoredJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function buildQueryString(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** Resolve relative upload paths (e.g. /uploads/…) to absolute URLs. */
export function resolveMediaUrl(path) {
  if (!path) return PLACEHOLDER_IMAGES[0];
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080/api';
  const origin = apiUrl.replace(/\/api\/?$/, '');
  return `${origin}/${String(path).replace(/^\//, '')}`;
}
