/**
 * Auto-submit a PayU Hosted Checkout form (POST to test.payu.in / secure.payu.in).
 * Leaves the storefront; PayU redirects back via API callback → /payment/payu/return.
 */
export function openPayUCheckout({ action, params }) {
  if (!action || !params || typeof params !== 'object') {
    throw new Error('Missing PayU checkout form parameters');
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.style.display = 'none';
  form.acceptCharset = 'UTF-8';

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}
