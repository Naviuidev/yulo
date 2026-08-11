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
  const regular = Number(price);
  const sale = Number(salePrice);
  if (!regular || !sale || sale >= regular) return 0;
  // Small discounts (e.g. ₹1000 → ₹999) would round to 0%; show at least 1%.
  return Math.max(1, Math.round(((regular - sale) / regular) * 100));
}
