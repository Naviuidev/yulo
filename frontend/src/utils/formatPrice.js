export function formatPrice(amount, currency = 'INR', fractionDigits = 0) {
  if (amount == null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(amount));
}

function positiveNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function getEffectivePrice(product) {
  if (!product) return 0;
  return positiveNumber(product.sale_price) ?? positiveNumber(product.price) ?? 0;
}

/** Payable unit price for a cart line (sale price when available). */
export function getCartItemUnitPrice(item) {
  if (!item) return 0;
  if (item.unit_price != null && item.unit_price !== '') {
    const unit = Number(item.unit_price);
    if (Number.isFinite(unit) && unit >= 0) return unit;
  }
  const productSale = positiveNumber(item.sale_price);
  if (item.variant_id) {
    const variantSale = positiveNumber(item.variant_sale_price);
    if (variantSale != null) return variantSale;
    if (productSale != null) return productSale;
    const variantRegular = positiveNumber(item.variant_price);
    if (variantRegular != null) return variantRegular;
  }
  return productSale ?? positiveNumber(item.price) ?? 0;
}

export function getDiscountPercent(price, salePrice) {
  const regular = Number(price);
  const sale = Number(salePrice);
  if (!regular || !sale || sale >= regular) return 0;
  // Small discounts (e.g. ₹1000 → ₹999) would round to 0%; show at least 1%.
  return Math.max(1, Math.round(((regular - sale) / regular) * 100));
}
