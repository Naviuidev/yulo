import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

const FALLBACK_TEXT =
  'Free shipping on orders above ₹999 · Premium eyewear collection now live';

/** Seconds to cross the screen once — slow, readable pace (similar to old marquee). */
function runDuration(text) {
  const len = String(text || '').length;
  // ~base + per-character time so longer lines stay easy to read
  return Math.min(48, Math.max(22, 18 + len * 0.28));
}

export default function AnnouncementBar() {
  const [messages, setMessages] = useState([FALLBACK_TEXT]);
  const [isScrolling, setIsScrolling] = useState(false);
  const [index, setIndex] = useState(0);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get('/offer-strips');
        const rows = data?.data ?? [];
        if (cancelled || !rows.length) return;

        const texts = rows.map((r) => String(r.text || '').trim()).filter(Boolean);
        if (!texts.length) return;

        setMessages(texts);
        setIsScrolling(Boolean(rows[0].is_scrolling));
        setIndex(0);
        setRunKey((k) => k + 1);
      } catch {
        // Keep fallback copy
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const current = useMemo(() => messages[index] || FALLBACK_TEXT, [messages, index]);

  const handleRunEnd = () => {
    setIndex((i) => (i + 1) % messages.length);
    setRunKey((k) => k + 1);
  };

  if (isScrolling) {
    return (
      <div className="announcement-bar announcement-bar--scroll" role="region" aria-label="Offers">
        <span
          key={runKey}
          className="announcement-bar__runner"
          style={{ '--run-duration': `${runDuration(current)}s` }}
          onAnimationEnd={handleRunEnd}
        >
          {current}
        </span>
      </div>
    );
  }

  return (
    <div className="announcement-bar announcement-bar--center" role="region" aria-label="Offers">
      <span className="announcement-bar__static">{current}</span>
    </div>
  );
}
