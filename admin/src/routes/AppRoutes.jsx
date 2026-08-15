import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute';
import AdminLayout from '../components/layout/AdminLayout';
import Login from '../pages/Login/Login';
import Dashboard from '../pages/Dashboard/Dashboard';
import Orders from '../pages/Orders/Orders';
import OrderDetail from '../pages/Orders/OrderDetail';
import Customers from '../pages/Customers/Customers';
import CustomerDetail from '../pages/Customers/CustomerDetail';
import Products from '../pages/Products/Products';
import ProductForm from '../pages/Products/ProductForm';
import Categories from '../pages/Categories/Categories';
import Brands from '../pages/Brands/Brands';
import Inventory from '../pages/Inventory/Inventory';
import Deliveries from '../pages/Deliveries/Deliveries';
import Followups from '../pages/Followups/Followups';
import OfferStrips from '../pages/OfferStrips/OfferStrips';
import FAQs from '../pages/FAQs/FAQs';
import Reviews from '../pages/Reviews/Reviews';
import Payments from '../pages/Payments/Payments';
import SocialConnects from '../pages/SocialConnects/SocialConnects';
import Shiprocket from '../pages/Shiprocket/Shiprocket';
import Notifications from '../pages/Notifications/Notifications';
import Visitors from '../pages/Visitors/Visitors';
import Doc from '../pages/Doc/Doc';
import AdminConfig from '../pages/AdminConfig/AdminConfig';
import Marketing from '../pages/Marketing/Marketing';
import MarketingFree from '../pages/Marketing/MarketingFree';
import StaffOnboard from '../pages/StaffOnboard/StaffOnboard';
import { useAuth } from '../context/AuthContext';
import { canAccessFeature, isMasterAdmin, navItemsForUser } from '../utils/constants';

function FeatureRoute({ feature, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const allowed =
    feature === 'admin-config' ? isMasterAdmin(user) : canAccessFeature(user, feature);

  if (!allowed) {
    const fallback = navItemsForUser(user)[0]?.path || '/login';
    return <Navigate to={fallback} state={{ from: location }} replace />;
  }

  return children;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/staff-onboard/:token" element={<StaffOnboard />} />

    <Route
      path="/"
      element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }
    >
      <Route
        index
        element={
          <FeatureRoute feature="dashboard">
            <Dashboard />
          </FeatureRoute>
        }
      />
      <Route path="analytics" element={<Navigate to="/?tab=analytics" replace />} />
      <Route path="revenue" element={<Navigate to="/?tab=revenue" replace />} />
      <Route
        path="orders"
        element={
          <FeatureRoute feature="orders">
            <Orders />
          </FeatureRoute>
        }
      />
      <Route
        path="orders/:id"
        element={
          <FeatureRoute feature="orders">
            <OrderDetail />
          </FeatureRoute>
        }
      />
      <Route
        path="customers"
        element={
          <FeatureRoute feature="customers">
            <Customers />
          </FeatureRoute>
        }
      />
      <Route
        path="customers/:id"
        element={
          <FeatureRoute feature="customers">
            <CustomerDetail />
          </FeatureRoute>
        }
      />
      <Route
        path="products"
        element={
          <FeatureRoute feature="products">
            <Products />
          </FeatureRoute>
        }
      />
      <Route
        path="products/new"
        element={
          <FeatureRoute feature="products">
            <ProductForm />
          </FeatureRoute>
        }
      />
      <Route
        path="products/:id/edit"
        element={
          <FeatureRoute feature="products">
            <ProductForm />
          </FeatureRoute>
        }
      />
      <Route
        path="categories"
        element={
          <FeatureRoute feature="categories">
            <Categories />
          </FeatureRoute>
        }
      />
      <Route
        path="brands"
        element={
          <FeatureRoute feature="brands">
            <Brands />
          </FeatureRoute>
        }
      />
      <Route
        path="inventory"
        element={
          <FeatureRoute feature="inventory">
            <Inventory />
          </FeatureRoute>
        }
      />
      <Route path="coupons" element={<Navigate to="/offer-strips?tab=coupons" replace />} />
      <Route
        path="deliveries"
        element={
          <FeatureRoute feature="deliveries">
            <Deliveries />
          </FeatureRoute>
        }
      />
      <Route
        path="followups"
        element={
          <FeatureRoute feature="followups">
            <Followups />
          </FeatureRoute>
        }
      />
      <Route path="reports" element={<Navigate to="/?tab=reports" replace />} />
      <Route path="banners" element={<Navigate to="/brands?tab=banners" replace />} />
      <Route
        path="offer-strips"
        element={
          <FeatureRoute feature="offer-strips">
            <OfferStrips />
          </FeatureRoute>
        }
      />
      <Route
        path="faqs"
        element={
          <FeatureRoute feature="faqs">
            <FAQs />
          </FeatureRoute>
        }
      />
      <Route
        path="reviews"
        element={
          <FeatureRoute feature="reviews">
            <Reviews />
          </FeatureRoute>
        }
      />
      <Route
        path="payments"
        element={
          <FeatureRoute feature="payments">
            <Payments />
          </FeatureRoute>
        }
      />
      <Route
        path="social-connects"
        element={
          <FeatureRoute feature="social-connects">
            <SocialConnects />
          </FeatureRoute>
        }
      />
      <Route path="whatsapp" element={<Navigate to="/social-connects" replace />} />
      <Route path="shiprocket" element={<Shiprocket />} />
      <Route
        path="notifications"
        element={
          <FeatureRoute feature="notifications">
            <Notifications />
          </FeatureRoute>
        }
      />
      <Route
        path="visitors"
        element={
          <FeatureRoute feature="visitors">
            <Visitors />
          </FeatureRoute>
        }
      />
      <Route
        path="marketing"
        element={
          <FeatureRoute feature="marketing">
            <Marketing />
          </FeatureRoute>
        }
      />
      <Route
        path="marketing-free"
        element={
          <FeatureRoute feature="marketing-free">
            <MarketingFree />
          </FeatureRoute>
        }
      />
      <Route
        path="admin-config"
        element={
          <FeatureRoute feature="admin-config">
            <AdminConfig />
          </FeatureRoute>
        }
      />
      <Route
        path="doc"
        element={
          <FeatureRoute feature="doc">
            <Doc />
          </FeatureRoute>
        }
      />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;
