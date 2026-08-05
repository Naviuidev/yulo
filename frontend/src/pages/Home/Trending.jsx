import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import ProductCard from '../../components/ui/ProductCard';
import { productService } from '../../services/productService';
import { MOCK_PRODUCTS } from '../../utils/constants';
import 'swiper/css';
import 'swiper/css/navigation';

export default function Trending() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    productService.getProducts({ sort: 'popular', per_page: 8 })
      .then((res) => setProducts(res.data?.data ?? MOCK_PRODUCTS))
      .catch(() => setProducts(MOCK_PRODUCTS));
  }, []);

  return (
    <section className="section-padding" style={{ background: 'var(--bg)' }} data-aos="fade-up">
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="section-title">Trending Now</h2>
          <div className="gold-line" />
        </div>
        <Swiper modules={[Navigation, Autoplay]} navigation spaceBetween={24} slidesPerView={2} autoplay={{ delay: 4000 }} breakpoints={{ 768: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } }}>
          {products.map((p, i) => (
            <SwiperSlide key={p.id}>
              <ProductCard product={p} index={i} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
