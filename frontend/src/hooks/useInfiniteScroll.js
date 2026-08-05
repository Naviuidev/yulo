import { useCallback, useEffect, useRef } from 'react';

export default function useInfiniteScroll({ hasMore, loading, onLoadMore, threshold = 200 }) {
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  const handleObserver = useCallback(
    (entries) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !loading) {
        onLoadMore();
      }
    },
    [hasMore, loading, onLoadMore]
  );

  useEffect(() => {
    const options = { root: null, rootMargin: `${threshold}px`, threshold: 0.1 };
    observerRef.current = new IntersectionObserver(handleObserver, options);
    const el = sentinelRef.current;
    if (el) observerRef.current.observe(el);
    return () => {
      if (el && observerRef.current) observerRef.current.unobserve(el);
    };
  }, [handleObserver, threshold]);

  return sentinelRef;
}
