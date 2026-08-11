import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, EffectFade, Autoplay } from 'swiper/modules';
import { BRAND_NAME, HERO_IMAGE } from '../../utils/constants';
import { resolveMediaUrl } from '../../utils/helpers';
import Button from '../../components/ui/Button';
import api from '../../services/api';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/effect-fade';

const HERO_CATCHLINE = 'Style that turns heads.';

export default function HeroBanner() {
  const [slides, setSlides] = useState([HERO_IMAGE]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get('/banners', { params: { position: 'home', limit: 3 } });
        const rows = data?.data ?? [];
        const urls = rows
          .map((b) => resolveMediaUrl(b.image))
          .filter(Boolean);
        if (!cancelled && urls.length) {
          setSlides(urls);
        }
      } catch {
        // Keep fallback HERO_IMAGE
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const multi = slides.length > 1;

  return (
    <section className="hero-banner">
      <div className="hero-banner__bg">
        <Swiper
          key={slides.join('|')}
          className="hero-banner__swiper"
          modules={[Navigation, EffectFade, Autoplay]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          speed={900}
          loop={multi}
          autoplay={multi ? { delay: 5000, disableOnInteraction: false } : false}
          navigation={
            multi
              ? {
                  prevEl: '.hero-banner__nav--prev',
                  nextEl: '.hero-banner__nav--next',
                }
              : false
          }
          allowTouchMove={multi}
        >
          {slides.map((src, i) => (
            <SwiperSlide key={`${src}-${i}`}>
              <img src={src} alt="" aria-hidden="true" />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {multi && (
        <>
          <button type="button" className="hero-banner__nav hero-banner__nav--prev" aria-label="Previous banner">
            <i className="bi bi-chevron-left" />
          </button>
          <button type="button" className="hero-banner__nav hero-banner__nav--next" aria-label="Next banner">
            <i className="bi bi-chevron-right" />
          </button>
        </>
      )}

      <div className="hero-banner__overlay" />
      <motion.div
        className="hero-banner__content"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <motion.h1
          className="hero-banner__brand"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.6 }}
        >
          {BRAND_NAME}
        </motion.h1>
        <p className="hero-banner__catchline">{HERO_CATCHLINE}</p>
        <div className="hero-banner__gold-line" />
        <div className="hero-banner__cta">
          <Link to="/shop">
            <Button variant="white">Shop Collection</Button>
          </Link>
          <Link to="/shop?sort=newest">
            <Button variant="outline" className="text-white border-white" style={{ color: '#fff', borderColor: '#fff' }}>
              New Arrivals
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
