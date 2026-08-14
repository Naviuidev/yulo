import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LazyLoad from 'react-lazy-load';
import api from '../../services/api';
import { resolveMediaUrl } from '../../utils/helpers';

export default function InstagramGallery() {
  const [feed, setFeed] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/instagram-feed')
      .then((res) => {
        if (!cancelled) setFeed(res.data?.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setFeed(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready || !feed?.enabled || !feed.items?.length) return null;

  const handle = String(feed.handle || 'yulofashion').replace(/^@/, '');
  const profileUrl = feed.profile_url || `https://www.instagram.com/${handle}/`;

  return (
    <section className="section-padding pt-0" data-aos="fade-up">
      <div className="container text-center mb-4">
        <a
          href={profileUrl}
          target="_blank"
          rel="noreferrer"
          className="text-decoration-none text-dark"
        >
          <h2 className="section-title" style={{ fontSize: '1.25rem' }}>@{handle}</h2>
        </a>
        <div className="gold-line" />
      </div>
      <div className="instagram-grid">
        {feed.items.map((item) => {
          const href = item.permalink || profileUrl;
          const external = Boolean(item.external) || /^https?:\/\//i.test(href);
          const className = 'instagram-grid__item';
          const img = (
            <LazyLoad height="100%">
              <img src={resolveMediaUrl(item.image_url)} alt={item.caption || `Instagram @${handle}`} />
            </LazyLoad>
          );

          if (external) {
            return (
              <a key={item.id} href={href} target="_blank" rel="noreferrer" className={className}>
                {img}
              </a>
            );
          }

          return (
            <Link key={item.id} to={href} className={className}>
              {img}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
