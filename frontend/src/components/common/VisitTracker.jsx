import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { trackPageView } from '../../services/visitService';

/**
 * Records storefront page views for admin /visitors analytics.
 * Mount once inside the router (App).
 */
export default function VisitTracker() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const path = `${location.pathname}${location.search || ''}` || '/';
    trackPageView({
      path,
      title: typeof document !== 'undefined' ? document.title : '',
      userId: user?.id || null,
    });
  }, [location.pathname, location.search, user?.id]);

  return null;
}
