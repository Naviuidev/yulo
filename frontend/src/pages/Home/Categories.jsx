import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay, FreeMode } from 'swiper/modules';
import { categoryService } from '../../services/productService';
import { MOCK_CATEGORIES, PLACEHOLDER_IMAGES } from '../../utils/constants';
import { resolveMediaUrl } from '../../utils/helpers';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/free-mode';

function flattenCategories(items = []) {
  return items
    .filter((cat) => !cat.parent_id)
    .map((cat, i) => ({
      ...cat,
      image: cat.image || cat.image_path || PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length],
    }));
}

export default function Categories() {
  const [categories, setCategories] = useState(MOCK_CATEGORIES);

  useEffect(() => {
    categoryService.getCategories()
      .then((res) => {
        const data = res.data?.data ?? [];
        const list = flattenCategories(Array.isArray(data) ? data : []);
        // Only fall back to mocks when the API request failed; empty DB stays empty
        setCategories(list);
      })
      .catch(() => setCategories(MOCK_CATEGORIES));
  }, []);

  return (
    <section className="category-slider-section" data-aos="fade-up">
      <div className="container">
        <Swiper
          className="category-slider"
          modules={[Navigation, Autoplay, FreeMode]}
          navigation
          freeMode
          spaceBetween={16}
          slidesPerView={2}
          autoplay={{ delay: 3500, disableOnInteraction: false }}
          breakpoints={{
            480: { slidesPerView: 3.2, spaceBetween: 16 },
            768: { slidesPerView: 5.5, spaceBetween: 20 },
            1024: { slidesPerView: 7, spaceBetween: 24 },
          }}
        >
          {categories.map((cat) => (
            <SwiperSlide key={cat.id}>
              <Link to={`/shop?category_id=${cat.id}`} className="category-slide">
                <div className="category-slide__icon">
                  <img src={resolveMediaUrl(cat.image ?? cat.image_path)} alt={cat.name} />
                </div>
                <span className="category-slide__name">{cat.name}</span>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
