import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { motion } from 'framer-motion';
import ProductBadge from './ProductBadge';
import PriceDisplay from './PriceDisplay';
import RatingStars from './RatingStars';
import useCart from '../../hooks/useCart';
import useWishlist from '../../hooks/useWishlist';
import { CompareContext } from '../../context/CompareContext';
import { useContext } from 'react';
import { getProductImages } from '../../utils/helpers';
import 'swiper/css';
import 'swiper/css/navigation';

export default function ProductCard({ product, index = 0 }) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCompare, isInCompare } = useContext(CompareContext);

  const images = getProductImages(product, index);
  const inWishlist = isInWishlist(product.id);
  const inCompare = isInCompare(product.id);
  const multi = images.length > 1;

  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <motion.div
      className="product-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}
    >
      <div className="product-card__image-wrap">
        {product.is_new && <ProductBadge type="new" />}
        {product.sale_price && <ProductBadge type="sale" />}
        {product.is_featured && !product.sale_price && !product.is_new && <ProductBadge type="featured" />}

        {multi ? (
          <Swiper
            className="product-card__swiper"
            modules={[Navigation]}
            navigation
            loop={images.length > 2}
            spaceBetween={0}
            slidesPerView={1}
            onClick={(swiper, event) => {
              // Keep nav button clicks from bubbling as card navigation
              const el = event?.target;
              if (el?.closest?.('.swiper-button-prev, .swiper-button-next')) {
                stop(event);
              }
            }}
          >
            {images.map((img, i) => (
              <SwiperSlide key={`${product.id}-${i}`}>
                <Link to={`/product/${product.slug}`} className="product-card__image-link">
                  <img src={img} alt={`${product.name} ${i + 1}`} className="product-card__image" loading="lazy" />
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          <Link to={`/product/${product.slug}`} className="product-card__image-link">
            <img src={images[0]} alt={product.name} className="product-card__image" loading="lazy" />
          </Link>
        )}

        <div className="product-card__actions">
          <button
            type="button"
            className={`product-card__action-btn ${inWishlist ? 'active' : ''}`}
            onClick={(e) => {
              stop(e);
              toggleWishlist(product);
            }}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <i className={`bi ${inWishlist ? 'bi-heart-fill' : 'bi-heart'}`} />
          </button>
          <button
            type="button"
            className="product-card__action-btn"
            onClick={(e) => {
              stop(e);
              addToCart(product);
            }}
            aria-label="Add to cart"
            title="Add to cart"
          >
            <i className="bi bi-bag-plus" />
          </button>
          <button
            type="button"
            className={`product-card__action-btn ${inCompare ? 'active' : ''}`}
            onClick={(e) => {
              stop(e);
              addToCompare(product);
            }}
            aria-label="Compare"
            title="Compare"
          >
            <i className="bi bi-arrow-left-right" />
          </button>
        </div>
      </div>

      <Link to={`/product/${product.slug}`} className="product-card__info text-decoration-none text-dark">
        {product.brand_name && (
          <div className="product-card__brand">{product.brand_name}</div>
        )}
        <h3 className="product-card__name">{product.name}</h3>
        {product.average_rating > 0 && (
          <RatingStars rating={product.average_rating} showValue />
        )}
        <PriceDisplay price={product.price} salePrice={product.sale_price} />
      </Link>
    </motion.div>
  );
}
