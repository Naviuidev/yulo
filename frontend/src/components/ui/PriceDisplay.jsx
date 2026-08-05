import { formatPrice, getDiscountPercent, getEffectivePrice } from '../../utils/formatPrice';

export default function PriceDisplay({ price, salePrice, size = 'md' }) {
  const effective = salePrice ?? price;
  const discount = getDiscountPercent(price, salePrice);
  const sizes = { sm: '0.875rem', md: '1rem', lg: '1.25rem' };

  return (
    <div className="price-display d-flex align-items-center gap-2 flex-wrap">
      <span className="fw-semibold" style={{ fontSize: sizes[size] }}>
        {formatPrice(effective)}
      </span>
      {salePrice && salePrice < price && (
        <>
          <span className="text-muted text-decoration-line-through" style={{ fontSize: '0.875rem' }}>
            {formatPrice(price)}
          </span>
          <span className="text-danger small fw-medium">-{discount}%</span>
        </>
      )}
    </div>
  );
}

export { getEffectivePrice };
