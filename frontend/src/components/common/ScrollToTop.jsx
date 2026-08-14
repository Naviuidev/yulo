import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scroll to top of the page on every route change. */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const scrollTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollTop();
    // Lazy pages may paint after the first scroll — nudge again next frame
    const id = window.requestAnimationFrame(scrollTop);
    return () => window.cancelAnimationFrame(id);
  }, [pathname, search]);

  return null;
}
