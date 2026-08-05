import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute';
import AdminLayout from '../components/layout/AdminLayout';
import Login from '../pages/Login/Login';
import Dashboard from '../pages/Dashboard/Dashboard';
import Analytics from '../pages/Analytics/Analytics';
import Revenue from '../pages/Revenue/Revenue';
import Orders from '../pages/Orders/Orders';
import OrderDetail from '../pages/Orders/OrderDetail';
import Customers from '../pages/Customers/Customers';
import CustomerDetail from '../pages/Customers/CustomerDetail';
import Products from '../pages/Products/Products';
import ProductForm from '../pages/Products/ProductForm';
import Categories from '../pages/Categories/Categories';
import Brands from '../pages/Brands/Brands';
import Inventory from '../pages/Inventory/Inventory';
import Coupons from '../pages/Coupons/Coupons';
import Deliveries from '../pages/Deliveries/Deliveries';
import Reports from '../pages/Reports/Reports';
import Banners from '../pages/Banners/Banners';
import Blogs from '../pages/Blogs/Blogs';
import FAQs from '../pages/FAQs/FAQs';
import Settings from '../pages/Settings/Settings';
import Notifications from '../pages/Notifications/Notifications';
import Visitors from '../pages/Visitors/Visitors';
import Doc from '../pages/Doc/Doc';

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />

    <Route
      path="/"
      element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Dashboard />} />
      <Route path="analytics" element={<Analytics />} />
      <Route path="revenue" element={<Revenue />} />
      <Route path="orders" element={<Orders />} />
      <Route path="orders/:id" element={<OrderDetail />} />
      <Route path="customers" element={<Customers />} />
      <Route path="customers/:id" element={<CustomerDetail />} />
      <Route path="products" element={<Products />} />
      <Route path="products/new" element={<ProductForm />} />
      <Route path="products/:id/edit" element={<ProductForm />} />
      <Route path="categories" element={<Categories />} />
      <Route path="brands" element={<Brands />} />
      <Route path="inventory" element={<Inventory />} />
      <Route path="coupons" element={<Coupons />} />
      <Route path="deliveries" element={<Deliveries />} />
      <Route path="reports" element={<Reports />} />
      <Route path="banners" element={<Banners />} />
      <Route path="blogs" element={<Blogs />} />
      <Route path="faqs" element={<FAQs />} />
      <Route path="settings" element={<Settings />} />
      <Route path="notifications" element={<Notifications />} />
      <Route path="visitors" element={<Visitors />} />
      <Route path="doc" element={<Doc />} />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;
