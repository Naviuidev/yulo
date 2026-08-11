import { formatPrice, getDiscountPercent, getEffectivePrice } from '../../utils/formatPrice';

export default function PriceDisplay({ price, salePrice, size = 'md' }) {
  const regular = Number(price);
  const sale = salePrice != null && salePrice !== '' ? Number(salePrice) : null;
  const hasSale = sale != null && !Number.isNaN(sale) && !Number.isNaN(regular) && sale > 0 && sale < regular;
  const discount = hasSale ? getDiscountPercent(regular, sale) : 0;
  const sizes = { sm: '0.875rem', md: '1rem', lg: '1.25rem' };

  return (
    <div className="price-display d-flex align-items-center gap-2 flex-wrap">
      {hasSale ? (
        <>
          <span className="text-muted text-decoration-line-through" style={{ fontSize: '0.875rem' }}>
            {formatPrice(regular)}
          </span>
          <span className="fw-semibold" style={{ fontSize: sizes[size] }}>
            {formatPrice(sale)}
          </span>
          {discount > 0 ? (
            <span className="text-danger small fw-medium">-{discount}%</span>
          ) : null}
        </>
      ) : (
        <span className="fw-semibold" style={{ fontSize: sizes[size] }}>
          {formatPrice(regular)}
        </span>
      )}
    </div>
  );
}

export { getEffectivePrice };
