import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import ProductCard from '../../components/ui/ProductCard';
import { productService } from '../../services/productService';
import { homeSectionService } from '../../services/homeSectionService';
import 'swiper/css';
import 'swiper/css/navigation';

export default function Trending() {
  const [products, setProducts] = useState([]);
  const [section, setSection] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      homeSectionService.getBySlug('trending'),
      productService.getProducts({ section: 'trending', per_page: 8 }),
    ])
      .then(([sectionRes, productsRes]) => {
        setSection(sectionRes.data?.data || null);
        setProducts(productsRes.data?.data || []);
      })
      .catch(() => {
        setSection(null);
        setProducts([]);
      })
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || products.length === 0) return null;

  const title = section?.name || 'Trending Now';
  const description = section?.description?.trim() || '';

  return (
    <section className="section-padding" style={{ background: 'var(--bg)' }} data-aos="fade-up">
      <div className="container">
        <div className="d-flex justify-content-between align-items-end mb-5">
          <div className="text-start flex-grow-1">
            <h2 className="section-title">{title}</h2>
            <div className="gold-line gold-line-left" />
            {description ? <p className="section-subtitle mb-0">{description}</p> : null}
          </div>
          <Link to="/shop?section=trending" className="small text-uppercase fw-medium text-decoration-none d-none d-md-inline">
            View All →
          </Link>
        </div>
        <Swiper
          className="product-slider"
          modules={[Navigation, Autoplay]}
          navigation
          spaceBetween={24}
          slidesPerView={2}
          autoplay={{ delay: 4000 }}
          breakpoints={{ 768: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } }}
        >
          {products.map((product, i) => (
            <SwiperSlide key={product.id}>
              <ProductCard product={product} index={i} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
