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

export function isGstApplicable(item) {
  if (!item || item.gst_applicable === undefined || item.gst_applicable === null) {
    return true;
  }
  return item.gst_applicable === true || item.gst_applicable === 1 || item.gst_applicable === '1';
}

/** GST only on products with gst_applicable enabled (matches backend). */
export function getCartGstTax(items, discount = 0, rate = 0.18) {
  let subtotal = 0;
  let gstSubtotal = 0;
  for (const item of items || []) {
    const line = getCartItemUnitPrice(item) * (item.quantity ?? 1);
    subtotal += line;
    if (isGstApplicable(item)) gstSubtotal += line;
  }
  if (gstSubtotal <= 0) return 0;
  const discountShare = discount > 0 && subtotal > 0 ? discount * (gstSubtotal / subtotal) : 0;
  const taxable = Math.max(0, gstSubtotal - discountShare);
  return Math.round(taxable * rate * 100) / 100;
}

/** Product custom shipping when enabled; otherwise free over ₹999 / ₹99. */
export function getCartShipping(items, subtotal, fallbackThreshold = 999, fallbackFee = 99) {
  let customTotal = 0;
  let hasCustom = false;
  for (const item of items || []) {
    const on = item.custom_shipping === true || item.custom_shipping === 1 || item.custom_shipping === '1';
    if (!on) continue;
    hasCustom = true;
    const fee = Number(item.shipping_price ?? 0);
    customTotal += Math.max(0, fee) * (item.quantity ?? 1);
  }
  if (hasCustom) return Math.round(customTotal * 100) / 100;
  return subtotal >= fallbackThreshold ? 0 : fallbackFee;
}

const SIZE_LABELS = {
  sm: 'S',
  m: 'M',
  l: 'L',
  xl: 'XL',
  xxl: 'XXL',
};

export function getProductSizeOptions(product) {
  let keys = Array.isArray(product?.sizes) ? product.sizes : [];
  if (keys.length === 0 && product?.size_option && product.size_option !== 'none') {
    keys = [product.size_option];
  }
  return keys
    .map((key) => SIZE_LABELS[String(key).toLowerCase()] || null)
    .filter(Boolean);
}

export function getProductColorOptions(product) {
  if (!product?.has_color_variants) return [];
  const colors = Array.isArray(product.colors) ? product.colors : [];
  return colors
    .filter((c) => c && (c.name || c.hex))
    .slice(0, 4)
    .map((c) => ({
      name: c.name || c.hex,
      hex: c.hex || '#000000',
    }));
}
