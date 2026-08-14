import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';
import AdminFavicon from './components/common/AdminFavicon';

function ToastIcon({ type }) {
  if (type === 'success') {
    return <i className="bi bi-check-circle-fill yulo-toast-mark yulo-toast-mark--success" aria-hidden="true" />;
  }
  if (type === 'error') {
    return <i className="bi bi-x-circle-fill yulo-toast-mark yulo-toast-mark--error" aria-hidden="true" />;
  }
  return false;
}

const App = () => (
  <HelmetProvider>
    <AuthProvider>
      <BrowserRouter>
        <AdminFavicon />
        <AppRoutes />
        <ToastContainer
          position="top-center"
          autoClose={4000}
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
      </BrowserRouter>
    </AuthProvider>
  </HelmetProvider>
);

export default App;
