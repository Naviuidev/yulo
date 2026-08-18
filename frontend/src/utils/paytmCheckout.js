let paytmLoaders = {};

function waitForCheckoutJs() {
  return new Promise((resolve, reject) => {
    const finish = () => {
      if (window.Paytm?.CheckoutJS) resolve(window.Paytm.CheckoutJS);
      else reject(new Error('Paytm CheckoutJS unavailable'));
    };

    if (window.Paytm?.CheckoutJS?.onLoad) {
      window.Paytm.CheckoutJS.onLoad(finish);
      return;
    }

    if (window.Paytm?.CheckoutJS) {
      finish();
      return;
    }

    reject(new Error('Paytm CheckoutJS unavailable'));
  });
}

function loadPaytmCheckoutJs(scriptUrl) {
  if (!scriptUrl) {
    return Promise.reject(new Error('Missing Paytm checkout script URL'));
  }

  if (paytmLoaders[scriptUrl]) return paytmLoaders[scriptUrl];

  paytmLoaders[scriptUrl] = new Promise((resolve, reject) => {
    const existing = Array.from(document.querySelectorAll('script[data-paytm-checkout]')).find(
      (el) => el.getAttribute('src') === scriptUrl || el.dataset.paytmCheckout === scriptUrl
    );

    const settle = () => {
      waitForCheckoutJs().then(resolve).catch(reject);
    };

    if (existing) {
      if (window.Paytm?.CheckoutJS) {
        settle();
        return;
      }
      existing.addEventListener('load', settle);
      existing.addEventListener('error', () => reject(new Error('Failed to load Paytm CheckoutJS')));
      return;
    }

    const script = document.createElement('script');
    script.type = 'application/javascript';
    script.src = scriptUrl;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.paytmCheckout = scriptUrl;
    script.onload = settle;
    script.onerror = () => {
      delete paytmLoaders[scriptUrl];
      reject(new Error('Failed to load Paytm CheckoutJS'));
    };
    document.body.appendChild(script);
  });

  return paytmLoaders[scriptUrl];
}

/**
 * Open Paytm JS Checkout overlay using txnToken from Initiate Transaction API.
 */
export async function openPaytmCheckout({
  orderId,
  txnToken,
  amount,
  mid,
  checkoutJsUrl,
}) {
  if (!orderId || !txnToken || !amount || !mid) {
    throw new Error('Missing Paytm checkout parameters');
  }

  const CheckoutJS = await loadPaytmCheckoutJs(checkoutJsUrl);

  const config = {
    root: '',
    flow: 'DEFAULT',
    data: {
      orderId: String(orderId),
      token: String(txnToken),
      tokenType: 'TXN_TOKEN',
      amount: String(amount),
    },
    merchant: {
      mid: String(mid),
      redirect: true,
    },
    handler: {
      notifyMerchant(eventName) {
        if (eventName === 'SESSION_EXPIRED') {
          // Token expired — caller can retry initiate.
        }
      },
    },
  };

  await CheckoutJS.init(config);
  CheckoutJS.invoke();
}
