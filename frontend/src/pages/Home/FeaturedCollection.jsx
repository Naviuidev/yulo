import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PLACEHOLDER_IMAGES } from '../../utils/constants';
import { resolveMediaUrl } from '../../utils/helpers';
import api from '../../services/api';

const FALLBACK = [
  {
    id: 'f1',
    title: 'Signature Sunglasses',
    image: PLACEHOLDER_IMAGES[0],
    link: '/shop',
    cta_text: 'Shop Now →',
  },
  {
    id: 'f2',
    title: 'Sunglasses',
    image: PLACEHOLDER_IMAGES[1],
    link: '/shop',
    cta_text: null,
  },
  {
    id: 'f3',
    title: 'Optical',
    image: PLACEHOLDER_IMAGES[2],
    link: '/shop',
    cta_text: null,
  },
];

export default function FeaturedCollection() {
  const [items, setItems] = useState(FALLBACK);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get('/featured-collections');
        const rows = data?.data ?? [];
        if (cancelled || !rows.length) return;

        setItems(
          rows.map((r) => ({
            id: r.id,
            title: r.title,
            image: resolveMediaUrl(r.image),
            link: r.link || '/shop',
            cta_text: r.cta_text || null,
          }))
        );
      } catch {
        // Keep fallback tiles
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const main = items[0];
  const side = items.slice(1, 3);

  if (!main) return null;

  return (
    <section className="featured-collection section-padding" data-aos="fade-up">
      <div className="container-fluid px-4">
        <div className="text-center mb-5">
          <h2 className="section-title">Featured Collection</h2>
          <div className="gold-line" />
          <p className="section-subtitle">Curated spectacles & sunglasses for every look</p>
        </div>
        <div className="featured-collection__grid">
          <Link to={main.link || '/shop'} className="featured-collection__main text-decoration-none">
            <img src={main.image} alt={main.title} />
            <div className="featured-collection__label">
              <h3>{main.title}</h3>
              {main.cta_text ? <span className="small opacity-75">{main.cta_text}</span> : null}
            </div>
          </Link>
          <div className="featured-collection__side">
            {side.map((item) => (
              <Link
                key={item.id}
                to={item.link || '/shop'}
                className="featured-collection__item text-decoration-none"
              >
                <img src={item.image} alt={item.title} />
                <div className="featured-collection__label">
                  <h3>{item.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
