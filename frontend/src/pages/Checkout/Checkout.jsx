import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/ui/Button';
import AddressForm from '../../components/forms/AddressForm';
import useCart from '../../hooks/useCart';
import useAuth from '../../hooks/useAuth';
import { formatPrice } from '../../utils/formatPrice';
import { couponService } from '../../services/orderService';
import { orderService, paymentService } from '../../services/orderService';
import { addressService } from '../../services/contentService';
import { PAYMENT_METHODS } from '../../utils/constants';

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const { register, handleSubmit } = useForm();

  const shipping = subtotal >= 999 ? 0 : 99;
  const total = subtotal + shipping - discount;

  useEffect(() => {
    if (isAuthenticated) {
      addressService.getAddresses()
        .then((r) => {
          const addrs = r.data?.data ?? [];
          setAddresses(addrs);
          const def = addrs.find((a) => a.is_default) ?? addrs[0];
          if (def) setSelectedAddress(def.id);
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const applyCoupon = async () => {
    try {
      const res = await couponService.validate(couponCode, subtotal);
      const data = res.data?.data;
      setDiscount(data?.discount_amount ?? 0);
      toast.success('Coupon applied!');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Invalid coupon');
    }
  };

  const handleGuestCheckout = async (data) => {
    await placeOrder({ guest: data });
  };

  const placeOrder = async (extra = {}) => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        address_id: selectedAddress,
        payment_method: paymentMethod,
        coupon_code: couponCode || undefined,
        ...extra,
      };
      const res = await orderService.createOrder(payload);
      const order = res.data?.data;

      if (paymentMethod === 'phonepe' && order?.id) {
        const payRes = await paymentService.initiatePhonePe(order.id);
        const url = payRes.data?.data?.redirect_url;
        if (url) {
          window.location.href = url;
          return;
        }
      }

      await clearCart();
      toast.success('Order placed successfully!');
      navigate(`/orders/${order?.id ?? ''}`);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  const saveAddress = async (data) => {
    try {
      const res = await addressService.createAddress(data);
      const addr = res.data?.data;
      setAddresses((prev) => [...prev, addr]);
      setSelectedAddress(addr.id);
      setShowAddressForm(false);
      toast.success('Address saved');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not save address');
    }
  };

  if (items.length === 0) {
    return (
      <div className="container py-5 text-center">
        <p>Your cart is empty.</p>
        <Link to="/shop"><Button>Shop Now</Button></Link>
      </div>
    );
  }

  return (
    <>
      <SEO title="Checkout" />
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ to: '/cart', label: 'Cart' }, { label: 'Checkout' }]} />
          <h1>Checkout</h1>
        </div>
      </div>

      <div className="container py-5">
        <div className="row g-5">
          <div className="col-lg-7">
            {!isAuthenticated && (
              <div className="border p-4 mb-4">
                <h5 className="text-uppercase small fw-semibold mb-3">Guest Checkout</h5>
                <form onSubmit={handleSubmit(handleGuestCheckout)} className="yulo-form">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <input className="form-control" placeholder="Full Name" {...register('name', { required: true })} />
                    </div>
                    <div className="col-md-6">
                      <input type="email" className="form-control" placeholder="Email" {...register('email', { required: true })} />
                    </div>
                    <div className="col-12">
                      <input className="form-control" placeholder="Phone" {...register('phone', { required: true })} />
                    </div>
                    <div className="col-12">
                      <input className="form-control" placeholder="Address" {...register('address_line1', { required: true })} />
                    </div>
                    <div className="col-md-4">
                      <input className="form-control" placeholder="City" {...register('city', { required: true })} />
                    </div>
                    <div className="col-md-4">
                      <input className="form-control" placeholder="State" {...register('state', { required: true })} />
                    </div>
                    <div className="col-md-4">
                      <input className="form-control" placeholder="PIN Code" {...register('pincode', { required: true })} />
                    </div>
                  </div>
                  <p className="small text-muted mt-3">
                    Have an account? <Link to="/login">Sign in</Link> for faster checkout.
                  </p>
                </form>
              </div>
            )}

            {isAuthenticated && (
              <div className="border p-4 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="text-uppercase small fw-semibold mb-0">Delivery Address</h5>
                  <button className="btn btn-link btn-sm p-0" onClick={() => setShowAddressForm(!showAddressForm)}>
                    {showAddressForm ? 'Cancel' : '+ Add Address'}
                  </button>
                </div>
                {showAddressForm ? (
                  <AddressForm onSubmit={saveAddress} />
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {addresses.length === 0 ? (
                      <p className="text-muted small">No saved addresses. Add one to continue.</p>
                    ) : (
                      addresses.map((addr) => (
                        <label key={addr.id} className={`border p-3 d-flex gap-2 ${selectedAddress === addr.id ? 'border-dark' : ''}`}>
                          <input type="radio" name="address" checked={selectedAddress === addr.id} onChange={() => setSelectedAddress(addr.id)} />
                          <div>
                            <strong>{addr.full_name}</strong>
                            <div className="small text-muted">{addr.address_line1}, {addr.city}, {addr.state} {addr.pincode}</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="border p-4">
              <h5 className="text-uppercase small fw-semibold mb-3">Payment Method</h5>
              {PAYMENT_METHODS.map((pm) => (
                <label key={pm.id} className={`d-flex align-items-center gap-3 border p-3 mb-2 ${paymentMethod === pm.id ? 'border-dark' : ''}`}>
                  <input type="radio" name="payment" checked={paymentMethod === pm.id} onChange={() => setPaymentMethod(pm.id)} />
                  <i className={`bi ${pm.icon}`} />
                  <span>{pm.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="col-lg-5">
            <div className="border p-4 sticky-top" style={{ top: 100 }}>
              <h5 className="text-uppercase small fw-semibold mb-4">Order Summary</h5>
              {items.map((item) => (
                <div key={item.id} className="d-flex justify-content-between small mb-2">
                  <span>{item.name} × {item.quantity}</span>
                  <span>{formatPrice((item.price ?? item.unit_price) * item.quantity)}</span>
                </div>
              ))}
              <hr />
              <div className="d-flex gap-2 mb-3">
                <input className="form-control form-control-sm" placeholder="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
                <Button variant="outline" onClick={applyCoupon}>Apply</Button>
              </div>
              <div className="d-flex justify-content-between mb-2"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              {discount > 0 && <div className="d-flex justify-content-between mb-2 text-success"><span>Discount</span><span>-{formatPrice(discount)}</span></div>}
              <div className="d-flex justify-content-between mb-2 text-muted small"><span>Shipping</span><span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
              <hr />
              <div className="d-flex justify-content-between fw-semibold mb-4"><span>Total</span><span>{formatPrice(total)}</span></div>
              <Button className="w-100" loading={loading} onClick={() => isAuthenticated ? placeOrder() : handleSubmit(handleGuestCheckout)()}>
                Place Order
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
