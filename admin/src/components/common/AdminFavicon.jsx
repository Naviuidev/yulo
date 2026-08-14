import { useEffect } from 'react';
import api from '../../services/api';
import { resolveMediaUrl } from '../../utils/media';

export const ADMIN_FAVICON_EVENT = 'yulo:favicon-updated';

function applyFavicon(href) {
  if (!href || typeof document === 'undefined') return;

  const bust = href.includes('?') ? `${href}&v=${Date.now()}` : `${href}?v=${Date.now()}`;

  document
    .querySelectorAll("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']")
    .forEach((el) => el.remove());

  const icon = document.createElement('link');
  icon.rel = 'icon';
  icon.type = 'image/png';
  icon.href = bust;
  document.head.appendChild(icon);

  const shortcut = document.createElement('link');
  shortcut.rel = 'shortcut icon';
  shortcut.href = bust;
  document.head.appendChild(shortcut);

  const apple = document.createElement('link');
  apple.rel = 'apple-touch-icon';
  apple.href = bust;
  document.head.appendChild(apple);
}

async function loadPublishedFavicon() {
  try {
    const res = await api.get('/settings');
    const settings = res.data?.data?.settings ?? {};
    const branding = settings.branding || {};
    const url = branding.favicon_published || branding.favicon_url || '';
    if (url) applyFavicon(resolveMediaUrl(url));
  } catch {
    /* keep default admin favicon */
  }
}

/** Applies the published site favicon to the admin panel browser tab. */
export default function AdminFavicon() {
  useEffect(() => {
    loadPublishedFavicon();

    const onUpdate = (event) => {
      const url = event?.detail?.url;
      if (url) {
        applyFavicon(resolveMediaUrl(url));
        return;
      }
      document
        .querySelectorAll("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']")
        .forEach((el) => el.remove());
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      link.href = '/logo.png';
      document.head.appendChild(link);
    };

    window.addEventListener(ADMIN_FAVICON_EVENT, onUpdate);
    return () => window.removeEventListener(ADMIN_FAVICON_EVENT, onUpdate);
  }, []);

  return null;
}
