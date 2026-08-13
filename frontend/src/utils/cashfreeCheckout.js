let cashfreeLoader = null;

export function loadCashfreeSdk() {
  if (typeof window !== 'undefined' && typeof window.Cashfree === 'function') {
    return Promise.resolve(window.Cashfree);
  }

  if (cashfreeLoader) return cashfreeLoader;

  cashfreeLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-cashfree-sdk]');
    if (existing) {
      const settle = () => {
        if (typeof window.Cashfree === 'function') resolve(window.Cashfree);
        else reject(new Error('Cashfree SDK unavailable'));
      };
      if (typeof window.Cashfree === 'function') {
        settle();
        return;
      }
      existing.addEventListener('load', settle);
      existing.addEventListener('error', () => reject(new Error('Failed to load Cashfree SDK')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.dataset.cashfreeSdk = 'true';
    script.onload = () => {
      if (typeof window.Cashfree === 'function') resolve(window.Cashfree);
      else reject(new Error('Cashfree SDK unavailable'));
    };
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    document.body.appendChild(script);
  });

  return cashfreeLoader;
}

/**
 * Open Cashfree hosted checkout. Does not navigate to order pages.
 * Throws if the SDK reports an error or no session id is provided.
 */
export async function openCashfreeCheckout({ paymentSessionId, env = 'sandbox' }) {
  if (!paymentSessionId) {
    throw new Error('Missing Cashfree payment session');
  }

  const Cashfree = await loadCashfreeSdk();
  const mode = env === 'production' ? 'production' : 'sandbox';
  const cashfree = Cashfree({ mode });

  const result = await cashfree.checkout({
    paymentSessionId,
    redirectTarget: '_self',
  });

  if (result?.error) {
    const msg =
      result.error.message ||
      result.error.error_description ||
      (typeof result.error === 'string' ? result.error : 'Cashfree checkout failed');
    throw new Error(msg);
  }

  return result;
}
