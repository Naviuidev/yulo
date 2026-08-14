import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { CompareProvider } from './context/CompareContext';
import { UIProvider } from './context/UIContext';
import App from './App';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'react-toastify/dist/ReactToastify.css';
import './styles/global.css';
import './styles/components.css';
import './styles/home.css';

function ToastIcon({ type }) {
  if (type === 'success') {
    return <i className="bi bi-check-circle-fill yulo-toast-mark yulo-toast-mark--success" aria-hidden="true" />;
  }
  if (type === 'error') {
    return <i className="bi bi-x-circle-fill yulo-toast-mark yulo-toast-mark--error" aria-hidden="true" />;
  }
  return false;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <CompareProvider>
                <UIProvider>
                  <App />
                  <ToastContainer
                    position="top-center"
                    autoClose={3000}
                    hideProgressBar
                    newestOnTop
                    closeOnClick
                    pauseOnHover
                    theme="colored"
                    icon={ToastIcon}
                    className="yulo-toast-container"
                    toastClassName="yulo-toast"
                    bodyClassName="yulo-toast__body"
                  />
                </UIProvider>
              </CompareProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);
