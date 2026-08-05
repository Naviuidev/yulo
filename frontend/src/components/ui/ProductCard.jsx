import { Link } from 'react-router-dom';
import LazyLoad from 'react-lazy-load';
import { motion } from 'framer-motion';
import ProductBadge from './ProductBadge';
import PriceDisplay from './PriceDisplay';
import RatingStars from './RatingStars';
import useCart from '../../hooks/useCart';
import useWishlist from '../../hooks/useWishlist';
import { CompareContext } from '../../context/CompareContext';
import { useContext } from 'react';
import { getProductImage } from '../../utils/helpers';

export default function ProductCard({ product, index = 0 }) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCompare, isInCompare } = useContext(CompareContext);

  const image = getProductImage(product, index);
  const inWishlist = isInWishlist(product.id);

  return (
    <motion.div
      className="product-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/product/${product.slug}`} className="text-decoration-none">
        <div className="product-card__image-wrap">
          {product.is_new && <ProductBadge type="new" />}
          {product.sale_price && <ProductBadge type="sale" />}
          {product.is_featured && !product.sale_price && <ProductBadge type="featured" />}
          <LazyLoad height="100%" offset={100}>
            <img src={image} alt={product.name} className="product-card__image" loading="lazy" />
          </LazyLoad>
          <div className="product-card__actions">
            <button
              type="button"
              className={`product-card__action-btn ${inWishlist ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                toggleWishlist(product);
              }}
              aria-label="Add to wishlist"
            >
              <i className={`bi ${inWishlist ? 'bi-heart-fill' : 'bi-heart'}`} />
            </button>
            <button
              type="button"
              className="product-card__action-btn"
              onClick={(e) => {
                e.preventDefault();
                addToCart(product);
              }}
              aria-label="Add to cart"
            >
              <i className="bi bi-bag-plus" />
            </button>
            <button
              type="button"
              className={`product-card__action-btn ${isInCompare(product.id) ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                addToCompare(product);
              }}
              aria-label="Compare"
            >
              <i className="bi bi-arrow-left-right" />
            </button>
          </div>
        </div>
        <div className="product-card__info">
          {product.brand_name && (
            <div className="product-card__brand">{product.brand_name}</div>
          )}
          <h3 className="product-card__name">{product.name}</h3>
          {product.average_rating > 0 && (
            <RatingStars rating={product.average_rating} showValue />
          )}
          <PriceDisplay price={product.price} salePrice={product.sale_price} />
        </div>
      </Link>
    </motion.div>
  );
}
