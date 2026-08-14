import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PriceDisplay from '../ui/PriceDisplay';
import RatingStars from '../ui/RatingStars';
import Button from '../ui/Button';
import { getProductImage } from '../../utils/helpers';

function reviewLabel(count) {
  const n = Number(count || 0);
  return `${n} ${n === 1 ? 'review' : 'reviews'}`;
}

function cleanDescription(text) {
  const value = String(text || '').trim();
  if (value.length < 12) return '';
  return value;
}

export default function AiSuggestModal({
  open,
  product,
  comparedCount = 0,
  buying = false,
  onClose,
  onBuyNow,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!product) return null;

  const rating = Number(product.average_rating || 0);
  const reviews = Number(product.review_count || 0);
  const stock = Number(product.stock ?? 0);
  const description = cleanDescription(product.description);
  const reasons = [
    rating > 0 ? `Top rated at ${rating.toFixed(1)}★` : 'Strong overall pick',
    reviews > 0 ? `${reviewLabel(reviews)} from verified buyers` : 'Best among compared items',
    stock > 0 ? `${stock} in stock` : 'Limited availability',
  ];

  return (
    <AnimatePresence>
      {open ? (
        <div className="yulo-ai-suggest" role="dialog" aria-modal="true" aria-labelledby="yulo-ai-suggest-title">
          <motion.button
            type="button"
            className="yulo-ai-suggest__backdrop"
            aria-label="Close suggestion"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            className="yulo-ai-suggest__panel"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="yulo-ai-suggest__header">
              <div className="yulo-ai-suggest__eyebrow">
                <i className="bi bi-stars" aria-hidden />
                <span id="yulo-ai-suggest-title">AI Suggest</span>
              </div>
              <button type="button" className="yulo-ai-suggest__close" onClick={onClose} aria-label="Close">
                <i className="bi bi-x-lg" />
              </button>
            </header>

            <div className="yulo-ai-suggest__body">
              <div className="yulo-ai-suggest__badge">Best match</div>
              <p className="yulo-ai-suggest__reason">
                Recommended from your {comparedCount} compared products
                {rating > 0
                  ? ` — ${rating.toFixed(1)}★ from ${reviewLabel(reviews)}.`
                  : ' based on price and availability.'}
              </p>

              <div className="yulo-ai-suggest__product">
                <div className="yulo-ai-suggest__media">
                  <img src={getProductImage(product)} alt={product.name} />
                </div>

                <div className="yulo-ai-suggest__info">
                  {product.brand_name ? (
                    <div className="yulo-ai-suggest__brand">{product.brand_name}</div>
                  ) : null}
                  <h3 className="yulo-ai-suggest__name">{product.name}</h3>

                  <div className="yulo-ai-suggest__rating-row">
                    <RatingStars rating={rating} showValue />
                    {reviews > 0 ? (
                      <span className="yulo-ai-suggest__reviews">({reviewLabel(reviews)})</span>
                    ) : null}
                  </div>

                  <div className="yulo-ai-suggest__price">
                    <PriceDisplay price={product.price} salePrice={product.sale_price} size="lg" />
                  </div>

                  <p className={`yulo-ai-suggest__stock ${stock > 0 ? '' : 'is-out'}`}>
                    {stock > 0 ? `${stock} available` : 'Out of stock'}
                  </p>

                  {description ? (
                    <p className="yulo-ai-suggest__desc">{description}</p>
                  ) : null}
                </div>
              </div>

              <ul className="yulo-ai-suggest__reasons">
                {reasons.map((reason) => (
                  <li key={reason}>
                    <i className="bi bi-check2" aria-hidden />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            <footer className="yulo-ai-suggest__footer">
              <Link
                to={`/product/${product.slug}`}
                className="btn btn-outline-dark yulo-ai-suggest__btn"
                onClick={onClose}
              >
                View details
              </Link>
              <Button
                variant="primary"
                className="yulo-ai-suggest__btn"
                loading={buying}
                disabled={stock <= 0}
                onClick={onBuyNow}
              >
                Buy Now
              </Button>
            </footer>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
