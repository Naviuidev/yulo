export function formatPrice(amount, currency = 'INR') {
  if (amount == null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export function getEffectivePrice(product) {
  if (!product) return 0;
  return product.sale_price ?? product.price ?? 0;
}

export function getDiscountPercent(price, salePrice) {
  if (!price || !salePrice || salePrice >= price) return 0;
  return Math.round(((price - salePrice) / price) * 100);
}
