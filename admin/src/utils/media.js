const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080/api';

/** Resolve relative upload paths to absolute URLs for admin previews. */
export function resolveMediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  const origin = API_URL.replace(/\/api\/?$/, '');
  return `${origin}/${String(path).replace(/^\//, '')}`;
}
