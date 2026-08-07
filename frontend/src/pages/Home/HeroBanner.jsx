import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BRAND_NAME, BRAND_TAGLINE, HERO_IMAGE } from '../../utils/constants';
import Button from '../../components/ui/Button';
import YuloLogo from '../../components/common/YuloLogo';

export default function HeroBanner() {
  return (
    <section className="hero-banner">
      <div className="hero-banner__bg">
        <img src={HERO_IMAGE} alt="YULO eyewear" />
      </div>
      <div className="hero-banner__overlay" />
      <motion.div
        className="hero-banner__content"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <motion.div
          className="hero-banner__logo-wrap"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <YuloLogo variant="light" className="hero-banner__logo" />
        </motion.div>
        <h1 className="visually-hidden">{BRAND_NAME}</h1>
        <div className="hero-banner__gold-line" />
        <p className="hero-banner__tagline">{BRAND_TAGLINE}</p>
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
