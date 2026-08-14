import { useEffect, useState } from 'react';
import { settingsService } from '../../services/contentService';
import { resolveMediaUrl } from '../../utils/helpers';

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

/** Applies the published storefront favicon from public settings. */
export default function SiteFavicon() {
  const [href, setHref] = useState(null);

  useEffect(() => {
    let cancelled = false;

    settingsService
      .getPublic()
      .then((res) => {
        const settings = res.data?.data?.settings ?? res.data?.settings ?? {};
        const branding = settings.branding || {};
        const url =
          branding.favicon_published ||
          branding.favicon_url ||
          '';

        if (cancelled || !url) return;

        const absolute = resolveMediaUrl(url);
        setHref(absolute);
        applyFavicon(absolute);
      })
      .catch(() => {
        /* keep default index.html favicon */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (href) applyFavicon(href);
  }, [href]);

  return null;
}
