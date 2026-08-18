import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ProtectedRoute from '../components/common/ProtectedRoute';
import Loader from '../components/common/Loader';

const Home = lazy(() => import('../pages/Home/Home'));
const Shop = lazy(() => import('../pages/Shop/Shop'));
const Product = lazy(() => import('../pages/Product/Product'));
const Cart = lazy(() => import('../pages/Cart/Cart'));
const Checkout = lazy(() => import('../pages/Checkout/Checkout'));
const Profile = lazy(() => import('../pages/Profile/Profile'));
const Orders = lazy(() => import('../pages/Orders/Orders'));
const OrderDetail = lazy(() => import('../pages/Orders/OrderDetail'));
const Wishlist = lazy(() => import('../pages/Wishlist/Wishlist'));
const Compare = lazy(() => import('../pages/Compare/Compare'));
const Blog = lazy(() => import('../pages/Blog/Blog'));
const BlogDetail = lazy(() => import('../pages/Blog/BlogDetail'));
const Contact = lazy(() => import('../pages/Contact/Contact'));
const About = lazy(() => import('../pages/About/About'));
const PrivacyPolicy = lazy(() => import('../pages/Privacy/PrivacyPolicy'));
const Terms = lazy(() => import('../pages/Legal/Terms'));
const ShippingPolicy = lazy(() => import('../pages/Legal/ShippingPolicy'));
const ReturnsPolicy = lazy(() => import('../pages/Legal/ReturnsPolicy'));
const Login = lazy(() => import('../pages/Auth/Login'));
const Register = lazy(() => import('../pages/Auth/Register'));
const ForgotPassword = lazy(() => import('../pages/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/Auth/ResetPassword'));
const VerifyEmail = lazy(() => import('../pages/Auth/VerifyEmail'));
const TrackOrder = lazy(() => import('../pages/TrackOrder/TrackOrder'));
const WriteReview = lazy(() => import('../pages/Reviews/WriteReview'));
const CashfreeReturn = lazy(() => import('../pages/Payment/CashfreeReturn'));
const PhonePeReturn = lazy(() => import('../pages/Payment/PhonePeReturn'));
const PaytmReturn = lazy(() => import('../pages/Payment/PaytmReturn'));
const RazorpayReturn = lazy(() => import('../pages/Payment/RazorpayReturn'));
const PayUReturn = lazy(() => import('../pages/Payment/PayUReturn'));
const NotFound = lazy(() => import('../pages/NotFound/NotFound'));

function SuspenseWrap({ children }) {
  return <Suspense fallback={<Loader fullScreen />}>{children}</Suspense>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<SuspenseWrap><Home /></SuspenseWrap>} />
        <Route path="shop" element={<SuspenseWrap><Shop /></SuspenseWrap>} />
        <Route path="product/:slug" element={<SuspenseWrap><Product /></SuspenseWrap>} />
        <Route path="cart" element={<SuspenseWrap><Cart /></SuspenseWrap>} />
        <Route
          path="checkout"
          element={
            <ProtectedRoute>
              <SuspenseWrap><Checkout /></SuspenseWrap>
            </ProtectedRoute>
          }
        />
        <Route path="wishlist" element={<SuspenseWrap><Wishlist /></SuspenseWrap>} />
        <Route path="compare" element={<SuspenseWrap><Compare /></SuspenseWrap>} />
        <Route path="blog" element={<SuspenseWrap><Blog /></SuspenseWrap>} />
        <Route path="blog/:slug" element={<SuspenseWrap><BlogDetail /></SuspenseWrap>} />
        <Route path="contact" element={<SuspenseWrap><Contact /></SuspenseWrap>} />
        <Route path="about" element={<SuspenseWrap><About /></SuspenseWrap>} />
        <Route path="privacy-policy" element={<SuspenseWrap><PrivacyPolicy /></SuspenseWrap>} />
        <Route path="terms" element={<SuspenseWrap><Terms /></SuspenseWrap>} />
        <Route path="shipping-policy" element={<SuspenseWrap><ShippingPolicy /></SuspenseWrap>} />
        <Route path="returns-policy" element={<SuspenseWrap><ReturnsPolicy /></SuspenseWrap>} />
        <Route path="track-order" element={<SuspenseWrap><TrackOrder /></SuspenseWrap>} />
        <Route path="write-review" element={<SuspenseWrap><WriteReview /></SuspenseWrap>} />
        <Route
          path="payment/cashfree/return"
          element={
            <ProtectedRoute>
              <SuspenseWrap><CashfreeReturn /></SuspenseWrap>
            </ProtectedRoute>
          }
        />
        <Route
          path="payment/phonepe/return"
          element={
            <ProtectedRoute>
              <SuspenseWrap><PhonePeReturn /></SuspenseWrap>
            </ProtectedRoute>
          }
        />
        <Route
          path="payment/paytm/return"
          element={
            <ProtectedRoute>
              <SuspenseWrap><PaytmReturn /></SuspenseWrap>
            </ProtectedRoute>
          }
        />
        <Route
          path="payment/razorpay/return"
          element={
            <ProtectedRoute>
              <SuspenseWrap><RazorpayReturn /></SuspenseWrap>
            </ProtectedRoute>
          }
        />
        <Route
          path="payment/payu/return"
          element={
            <ProtectedRoute>
              <SuspenseWrap><PayUReturn /></SuspenseWrap>
            </ProtectedRoute>
          }
        />
        <Route path="login" element={<SuspenseWrap><Login /></SuspenseWrap>} />
        <Route path="register" element={<SuspenseWrap><Register /></SuspenseWrap>} />
        <Route path="forgot-password" element={<SuspenseWrap><ForgotPassword /></SuspenseWrap>} />
        <Route path="reset-password" element={<SuspenseWrap><ResetPassword /></SuspenseWrap>} />
        <Route path="verify-email" element={<SuspenseWrap><VerifyEmail /></SuspenseWrap>} />
        <Route path="profile" element={<ProtectedRoute><SuspenseWrap><Profile /></SuspenseWrap></ProtectedRoute>} />
        <Route path="orders" element={<ProtectedRoute><SuspenseWrap><Orders /></SuspenseWrap></ProtectedRoute>} />
        <Route path="orders/:id" element={<ProtectedRoute><SuspenseWrap><OrderDetail /></SuspenseWrap></ProtectedRoute>} />
        <Route path="*" element={<SuspenseWrap><NotFound /></SuspenseWrap>} />
      </Route>
    </Routes>
  );
}
