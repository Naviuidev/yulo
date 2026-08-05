import { useRef } from 'react';

export default function ImageZoom({ src, alt }) {
  const containerRef = useRef(null);

  const handleMove = (e) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--x', `${x}%`);
    el.style.setProperty('--y', `${y}%`);
  };

  return (
    <div
      ref={containerRef}
      className="image-zoom-container"
      onMouseMove={handleMove}
      style={{ '--x': '50%', '--y': '50%' }}
    >
      <img
        src={src}
        alt={alt}
        style={{ transformOrigin: 'var(--x) var(--y)' }}
      />
    </div>
  );
}
