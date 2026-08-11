import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CountdownTimer from '../../components/ui/CountdownTimer';
import ProductCard from '../../components/ui/ProductCard';
import { productService } from '../../services/productService';
import { homeSectionService } from '../../services/homeSectionService';

export default function FlashSale() {
  const [products, setProducts] = useState([]);
  const [section, setSection] = useState(null);
  const [scheduleReady, setScheduleReady] = useState(false);
  const [hasSchedule, setHasSchedule] = useState(false);
  const [saleEndsAt, setSaleEndsAt] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      homeSectionService.getBySlug('flash-sale'),
      productService.getProducts({ section: 'flash-sale', per_page: 8 }),
    ])
      .then(([sectionRes, productsRes]) => {
        if (cancelled) return;
        const row = sectionRes.data?.data;
        const configured = Boolean(
          row?.sale_start_date &&
            row?.sale_end_date &&
            row?.sale_start_time &&
            row?.sale_end_time
        );
        setSection(row || null);
        setHasSchedule(configured);
        setSaleEndsAt(row?.sale_ends_at || null);
        setProducts(configured ? productsRes.data?.data || [] : []);
      })
      .catch(() => {
        if (!cancelled) {
          setSection(null);
          setHasSchedule(false);
          setSaleEndsAt(null);
          setProducts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setScheduleReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!scheduleReady || !hasSchedule || products.length === 0) return null;

  const title = section?.name || 'Flash Sale';
  const description = section?.description?.trim() || '';

  return (
    <section className="flash-sale section-padding" data-aos="fade-up">
      <div className="container">
        <div className="row align-items-center mb-5">
          <div className="col-md-6">
            <h2 className="section-title">{title}</h2>
            <div className="gold-line gold-line-left" />
            {description ? <p className="opacity-75 mb-0">{description}</p> : null}
          </div>
          <div className="col-md-6 text-md-end mt-3 mt-md-0">
            {saleEndsAt ? <CountdownTimer endDate={saleEndsAt} /> : null}
          </div>
        </div>
        <div className="row g-4">
          {products.map((product, i) => (
            <div key={product.id} className="col-6 col-lg-3">
              <ProductCard product={product} index={i} />
            </div>
          ))}
        </div>
        <div className="text-center mt-5">
          <Link to="/shop?section=flash-sale" className="btn-yulo btn-yulo-gold">
            Shop Flash Sale
          </Link>
        </div>
      </div>
    </section>
  );
}
