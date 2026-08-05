import { PLACEHOLDER_IMAGES } from './constants';

export function getProductImage(product, index = 0) {
  if (!product) return PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
  return (
    product.primary_image ||
    product.image ||
    product.image_path ||
    (product.images?.[0]?.image_path ?? product.images?.[0]?.url) ||
    PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length]
  );
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
