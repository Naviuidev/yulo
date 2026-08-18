let razorpayLoader = null;

export function loadRazorpaySdk() {
  if (typeof window !== 'undefined' && typeof window.Razorpay === 'function') {
    return Promise.resolve(window.Razorpay);
  }

  if (razorpayLoader) return razorpayLoader;

  razorpayLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-razorpay-sdk]');
    if (existing) {
      const settle = () => {
        if (typeof window.Razorpay === 'function') resolve(window.Razorpay);
        else reject(new Error('Razorpay SDK unavailable'));
      };
      if (typeof window.Razorpay === 'function') {
        settle();
        return;
      }
      existing.addEventListener('load', settle);
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay SDK')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpaySdk = 'true';
    script.onload = () => {
      if (typeof window.Razorpay === 'function') resolve(window.Razorpay);
      else reject(new Error('Razorpay SDK unavailable'));
    };
    script.onerror = () => {
      razorpayLoader = null;
      reject(new Error('Failed to load Razorpay SDK'));
    };
    document.body.appendChild(script);
  });

  return razorpayLoader;
}

function buildReturnPath(returnUrl, response, extraParams = {}) {
  const url = new URL(returnUrl || '/payment/razorpay/return', window.location.origin);
  url.searchParams.set('razorpay_order_id', response.razorpay_order_id || '');
  url.searchParams.set('razorpay_payment_id', response.razorpay_payment_id || '');
  url.searchParams.set('razorpay_signature', response.razorpay_signature || '');
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return `${url.pathname}${url.search}`;
}

/**
 * Open Razorpay Standard Checkout, then redirect to the storefront success page
 * so the gateway UI closes and the user sees View Order / Continue Shopping.
 */
export async function openRazorpayCheckout({
  keyId,
  amount,
  currency = 'INR',
  orderId,
  name = 'YULO',
  description = 'Order payment',
  prefill = {},
  themeColor = '#072654',
  returnUrl = '/payment/razorpay/return',
  yuloOrderId = '',
}) {
  if (!keyId || !orderId || !amount) {
    throw new Error('Missing Razorpay checkout parameters');
  }

  const Razorpay = await loadRazorpaySdk();

  return new Promise((resolve, reject) => {
    let settled = false;

    const rzp = new Razorpay({
      key: keyId,
      amount,
      currency,
      name,
      description,
      order_id: orderId,
      prefill,
      theme: { color: themeColor },
      handler(response) {
        if (settled) return;
        settled = true;
        // Full navigation closes the Razorpay overlay and opens our success page.
        window.location.assign(
          buildReturnPath(returnUrl, response, {
            order_id: yuloOrderId,
          })
        );
        resolve(response);
      },
      modal: {
        ondismiss() {
          if (settled) return;
          settled = true;
          reject(new Error('Payment cancelled'));
        },
      },
    });

    rzp.on('payment.failed', (response) => {
      if (settled) return;
      settled = true;
      const msg =
        response?.error?.description ||
        response?.error?.reason ||
        'Razorpay payment failed';
      reject(new Error(msg));
    });

    rzp.open();
  });
}
