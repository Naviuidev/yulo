import api from './api';

const VISITOR_KEY = 'yulo_visitor_id';
const SESSION_KEY = 'yulo_session_id';
const LAST_PV_KEY = 'yulo_last_pv';

function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreate(storage, key) {
  try {
    let id = storage.getItem(key);
    if (!id) {
      id = uuid();
      storage.setItem(key, id);
    }
    return id;
  } catch {
    return uuid();
  }
}

/** Fire-and-forget page view for storefront visitor analytics. */
export async function trackPageView({ path, title, userId } = {}) {
  if (typeof window === 'undefined') return;

  const cleanPath = (path || window.location.pathname || '/').slice(0, 500);
  const now = Date.now();

  try {
    const last = sessionStorage.getItem(LAST_PV_KEY);
    if (last) {
      const [prevPath, prevTs] = last.split('|');
      if (prevPath === cleanPath && now - Number(prevTs) < 1200) {
        return;
      }
    }
    sessionStorage.setItem(LAST_PV_KEY, `${cleanPath}|${now}`);
  } catch {
    // ignore storage errors
  }

  const payload = {
    path: cleanPath,
    title: (title || document.title || '').slice(0, 255),
    referrer: (document.referrer || '').slice(0, 500),
    visitor_id: getOrCreate(localStorage, VISITOR_KEY),
    session_id: getOrCreate(sessionStorage, SESSION_KEY),
  };

  if (userId) {
    payload.user_id = userId;
  }

  try {
    await api.post('/analytics/visit', payload);
  } catch {
    // never block UX for analytics
  }
}

export default { trackPageView };
