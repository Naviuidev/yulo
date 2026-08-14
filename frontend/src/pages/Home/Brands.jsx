import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { brandService } from '../../services/productService';
import { resolveMediaUrl } from '../../utils/helpers';

function BrandItem({ brand }) {
  const logo = brand.logo ? resolveMediaUrl(brand.logo) : null;

  return (
    <Link
      to={`/shop?brand_id=${brand.id}`}
      className="brands-marquee__item text-decoration-none"
      title={brand.name}
    >
      {logo ? (
        <img src={logo} alt={brand.name} className="brands-marquee__logo" loading="lazy" />
      ) : (
        <span className="brands-marquee__name">{brand.name}</span>
      )}
    </Link>
  );
}

export default function Brands() {
  const [brands, setBrands] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    brandService
      .getBrands()
      .then((res) => {
        if (cancelled) return;
        const rows = res.data?.data;
        setBrands(Array.isArray(rows) ? rows.filter((b) => b?.id) : []);
      })
      .catch(() => {
        if (!cancelled) setBrands([]);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Two identical halves so translateX(-50%) loops seamlessly
  const track = useMemo(() => {
    if (!brands.length) return [];
    const half = brands.length < 6 ? [...brands, ...brands, ...brands] : brands;
    return [...half, ...half];
  }, [brands]);

  // Slow pace: longer list = longer duration so movement stays calm
  const durationSec = useMemo(() => {
    const n = Math.max(brands.length, 1);
    return Math.min(90, Math.max(28, n * 8));
  }, [brands.length]);

  if (!ready || !brands.length) return null;

  return (
    <section className="section-padding border-top border-bottom brands-section" data-aos="fade-up">
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="section-title">Our Brands</h2>
          <div className="gold-line" />
        </div>
      </div>
      <div className="brands-marquee" style={{ '--brands-duration': `${durationSec}s` }}>
        <div className="brands-marquee__track">
          {track.map((b, i) => (
            <BrandItem key={`${b.id}-${i}`} brand={b} />
          ))}
        </div>
      </div>
    </section>
  );
}
