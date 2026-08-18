import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import AddressForm from '../../components/forms/AddressForm';
import useCart from '../../hooks/useCart';
import useAuth from '../../hooks/useAuth';
import { formatPrice, getCartGstTax, getCartItemUnitPrice, getCartShipping } from '../../utils/formatPrice';
import { couponService, orderService, paymentService } from '../../services/orderService';
import { addressService } from '../../services/contentService';
import { openCashfreeCheckout } from '../../utils/cashfreeCheckout';
import { openPaytmCheckout } from '../../utils/paytmCheckout';
import { openRazorpayCheckout } from '../../utils/razorpayCheckout';
import { openPayUCheckout } from '../../utils/payuCheckout';

function formatAddress(addr) {
  if (!addr) return '';
  const name = addr.name || addr.full_name || '';
  const line2 = addr.address_line2 ? `, ${addr.address_line2}` : '';
  return `${name} · ${addr.address_line1}${line2}, ${addr.city}, ${addr.state} ${addr.pincode}`;
}

function normalizePhone(phone) {
  return String(phone || '')
    .replace(/\D/g, '')
    .replace(/^91/, '')
    .slice(-10);
}

export default function Checkout() {
  const { items, subtotal, refreshCart } = useCart();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);

  const [showChangeModal, setShowChangeModal] = useState(false);
  const [modalMode, setModalMode] = useState('list'); // list | add | edit
  const [editingAddress, setEditingAddress] = useState(null);
  const [activeGateway, setActiveGateway] = useState(null);
  const [gatewayReady, setGatewayReady] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState('online'); // online | cod

  const shipping = getCartShipping(items, subtotal);
  // Match backend: GST only on products with gst_applicable enabled.
  const tax = getCartGstTax(items, discount);
  const total = Math.max(0, Math.round((subtotal - discount + shipping + tax) * 100) / 100);

  const codEligible =
    items.length > 0 && items.every((item) => Number(item.cod_available ?? 1) === 1);

  const selectedAddress = useMemo(
    () => addresses.find((a) => Number(a.id) === Number(selectedAddressId)) || null,
    [addresses, selectedAddressId]
  );

  const loadAddresses = useCallback(async () => {
    try {
      const res = await addressService.getAddresses();
      const addrs = res.data?.data ?? [];
      setAddresses(addrs);
      setSelectedAddressId((prev) => {
        if (prev && addrs.some((a) => Number(a.id) === Number(prev))) return prev;
        const def = addrs.find((a) => a.is_default) ?? addrs[0];
        return def?.id ?? null;
      });
    } catch {
      setAddresses([]);
      setSelectedAddressId(null);
    } finally {
      setAddressesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login', { replace: true, state: { from: { pathname: '/checkout' } } });
      return;
    }
    loadAddresses();
  }, [authLoading, isAuthenticated, navigate, loadAddresses]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await paymentService.getActiveGateway();
        if (cancelled) return;
        const data = res.data?.data;
        setActiveGateway(data?.gateway || null);
        setGatewayReady(Boolean(data?.configured && data?.gateway));
      } catch {
        if (!cancelled) {
          setActiveGateway(null);
          setGatewayReady(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (gatewayReady) {
      setPaymentChoice('online');
      return;
    }
    if (codEligible) {
      setPaymentChoice('cod');
    }
  }, [gatewayReady, codEligible]);

  const applyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) {
      toast.error('Enter a coupon code');
      return;
    }
    setCouponLoading(true);
    try {
      const res = await couponService.validate(code, subtotal);
      const data = res.data?.data;
      const amount = Number(data?.discount ?? data?.discount_amount ?? 0);
      if (!amount || amount <= 0) {
        throw new Error('Coupon does not apply to this order');
      }
      setDiscount(amount);
      setAppliedCoupon({
        code: data?.code || code.toUpperCase(),
        type: data?.type,
        value: data?.value,
        label: data?.label,
      });
      setCouponCode((data?.code || code).toUpperCase());
      toast.success(data?.label ? `Coupon applied — ${data.label}` : 'Coupon applied!');
    } catch (err) {
      setDiscount(0);
      setAppliedCoupon(null);
      toast.error(err.response?.data?.message ?? err.message ?? 'Invalid coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const clearCoupon = () => {
    setDiscount(0);
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const openChangeAddress = () => {
    setModalMode('list');
    setEditingAddress(null);
    setShowChangeModal(true);
  };

  const openAddAddress = () => {
    setEditingAddress(null);
    setModalMode('add');
    setShowChangeModal(true);
  };

  const openEditAddress = (addr) => {
    setEditingAddress(addr);
    setModalMode('edit');
    setShowChangeModal(true);
  };

  const closeModal = () => {
    setShowChangeModal(false);
    setModalMode('list');
    setEditingAddress(null);
  };

  const saveAddress = async (data) => {
    setAddressSaving(true);
    try {
      const payload = {
        ...data,
        name: data.name || data.full_name,
        phone: normalizePhone(data.phone),
        is_default: Boolean(data.is_default),
      };

      let saved;
      if (modalMode === 'edit' && editingAddress?.id) {
        const res = await addressService.updateAddress(editingAddress.id, payload);
        saved = res.data?.data;
        toast.success('Address updated');
      } else {
        const res = await addressService.createAddress(payload);
        saved = res.data?.data;
        toast.success('Address saved');
      }

      const wasEmpty = addresses.length === 0;
      await loadAddresses();
      if (saved?.id) setSelectedAddressId(saved.id);
      else if (editingAddress?.id) setSelectedAddressId(editingAddress.id);

      if (wasEmpty) {
        closeModal();
      } else {
        setModalMode('list');
        setEditingAddress(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not save address');
    } finally {
      setAddressSaving(false);
    }
  };

  const payNow = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (!selectedAddressId) {
      toast.error('Please add a delivery address');
      openAddAddress();
      return;
    }

    if (paymentChoice === 'cod') {
      if (!codEligible) {
        toast.error('Cash on Delivery is not available for one or more products in your cart.');
        return;
      }
      setLoading(true);
      try {
        const res = await orderService.checkoutCod({
          shipping_address_id: selectedAddressId,
          coupon_code: couponCode || undefined,
          shipping_charge: shipping,
        });
        const orderId = res.data?.data?.order_id;
        toast.success('Order placed — pay cash on delivery');
        try {
          await refreshCart?.();
        } catch {
          // ignore
        }
        navigate(orderId ? `/profile?section=orders&order=${orderId}` : '/profile?section=orders', {
          replace: true,
        });
      } catch (err) {
        toast.error(err.response?.data?.message ?? err.message ?? 'Could not place COD order');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!gatewayReady || !activeGateway) {
      toast.error('Online payments are not available right now. Please try again later.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        shipping_address_id: selectedAddressId,
        coupon_code: couponCode || undefined,
        shipping_charge: shipping,
      };

      if (activeGateway === 'phonepe') {
        const res = await orderService.checkoutPhonePe(payload);
        const pay = res.data?.data;
        const redirectUrl = pay?.redirect_url;
        if (!redirectUrl) {
          throw new Error('Could not start PhonePe checkout. Check Admin → Payments credentials.');
        }
        window.location.href = redirectUrl;
        return;
      }

      if (activeGateway === 'paytm') {
        const res = await orderService.checkoutPaytm(payload);
        const pay = res.data?.data;
        if (!pay?.txn_token || !pay?.mid || !pay?.paytm_order_id) {
          throw new Error('Could not start Paytm checkout. Check Admin → Payments credentials.');
        }
        await openPaytmCheckout({
          orderId: pay.paytm_order_id,
          txnToken: pay.txn_token,
          amount: pay.amount,
          mid: pay.mid,
          checkoutJsUrl: pay.checkout_js_url,
        });
        toast.info('Complete payment in the Paytm window to confirm your order.');
        return;
      }

      if (activeGateway === 'razorpay') {
        const res = await orderService.checkoutRazorpay(payload);
        const pay = res.data?.data;
        if (!pay?.razorpay_order_id || !pay?.key_id) {
          throw new Error('Could not start Razorpay checkout. Check Admin → Payments credentials.');
        }

        await openRazorpayCheckout({
          keyId: pay.key_id,
          amount: pay.amount,
          currency: pay.currency || 'INR',
          orderId: pay.razorpay_order_id,
          description: `Order ${pay.order_number || ''}`.trim(),
          prefill: pay.prefill || {},
          returnUrl: '/payment/razorpay/return',
          yuloOrderId: pay.order_id,
        });
        // Browser navigates to the success page from the Razorpay handler.
        return;
      }

      if (activeGateway === 'payu') {
        const res = await orderService.checkoutPayU(payload);
        const pay = res.data?.data;
        if (!pay?.action || !pay?.params) {
          throw new Error('Could not start PayU checkout. Check Admin → Payments credentials.');
        }
        openPayUCheckout({ action: pay.action, params: pay.params });
        return;
      }

      if (activeGateway === 'cashfree') {
        const res = await orderService.checkoutCashfree(payload);
        const pay = res.data?.data;
        const sessionId = pay?.payment_session_id;
        if (!sessionId) {
          throw new Error('Could not start Cashfree checkout. Check Admin → Payments credentials.');
        }

        await openCashfreeCheckout({
          paymentSessionId: sessionId,
          env: pay?.env || 'sandbox',
        });
        toast.info('Complete payment in the Cashfree window to confirm your order.');
        return;
      }

      throw new Error('No payment gateway is published. Publish one under Admin → Payments.');
    } catch (err) {
      if (err?.message === 'Payment cancelled') {
        toast.info('Payment cancelled');
      } else {
        toast.error(err.response?.data?.message ?? err.message ?? 'Could not start payment');
      }
    } finally {
      setLoading(false);
    }
  };

  const paymentLabel =
    activeGateway === 'phonepe'
      ? 'PhonePe'
      : activeGateway === 'paytm'
        ? 'Paytm'
        : activeGateway === 'razorpay'
          ? 'Razorpay'
          : activeGateway === 'payu'
            ? 'PayU'
            : activeGateway === 'cashfree'
            ? 'Easy Cash (Cashfree)'
            : null;

  if (authLoading || !isAuthenticated) {
    return (
      <div className="container py-5 text-center text-muted">
        Checking login…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container py-5 text-center">
        <p>Your cart is empty.</p>
        <Link to="/shop">
          <Button>Shop Now</Button>
        </Link>
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
            <div className="border p-4 mb-4">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <h5 className="text-uppercase small fw-semibold mb-0">Delivery Address</h5>
                {addressesLoaded && addresses.length > 0 ? (
                  <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={openChangeAddress}>
                    Change Address
                  </button>
                ) : null}
              </div>

              {!addressesLoaded ? (
                <p className="text-muted small mb-0">Loading addresses…</p>
              ) : selectedAddress ? (
                <div className="border p-3 bg-light">
                  <div className="fw-semibold">{selectedAddress.name || selectedAddress.full_name}</div>
                  <div className="small text-muted mt-1">
                    {selectedAddress.address_line1}
                    {selectedAddress.address_line2 ? `, ${selectedAddress.address_line2}` : ''}
                  </div>
                  <div className="small text-muted">
                    {selectedAddress.city}, {selectedAddress.state} {selectedAddress.pincode}
                  </div>
                  <div className="small text-muted mt-1">Phone: {selectedAddress.phone}</div>
                </div>
              ) : (
                <div className="border border-dashed p-4 text-center">
                  <p className="text-muted mb-3">No delivery address found. Add an address to continue.</p>
                  <Button variant="outline" onClick={openAddAddress}>
                    Add Address
                  </Button>
                </div>
              )}
            </div>

            <div className="border p-4">
              <h5 className="text-uppercase small fw-semibold mb-3">Payment</h5>
              {(gatewayReady || codEligible) ? (
                <div className="row g-2">
                  {gatewayReady ? (
                    <div className={codEligible ? 'col-6' : 'col-12'}>
                      <button
                        type="button"
                        className={`btn w-100 py-3 ${
                          paymentChoice === 'online' ? 'btn-dark' : 'btn-outline-dark'
                        }`}
                        onClick={() => setPaymentChoice('online')}
                      >
                        <span className="d-block fw-semibold">Pay online</span>
                        <span className={`small d-block mt-1 ${paymentChoice === 'online' ? 'text-white-50' : 'text-muted'}`}>
                          {paymentLabel}
                        </span>
                      </button>
                    </div>
                  ) : null}

                  {codEligible ? (
                    <div className={gatewayReady ? 'col-6' : 'col-12'}>
                      <button
                        type="button"
                        className={`btn w-100 py-3 ${
                          paymentChoice === 'cod' ? 'btn-dark' : 'btn-outline-dark'
                        }`}
                        onClick={() => setPaymentChoice('cod')}
                      >
                        <span className="d-block fw-semibold">Cash on Delivery</span>
                        <span className={`small d-block mt-1 ${paymentChoice === 'cod' ? 'text-white-50' : 'text-muted'}`}>
                          Pay on delivery
                        </span>
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="small text-muted mb-0">
                  Online payments are not configured yet, and COD is not available for this cart.
                </p>
              )}

              {gatewayReady && !codEligible ? (
                <p className="small text-muted mb-0 mt-2">
                  COD unavailable — one or more products in your cart do not allow Cash on Delivery.
                </p>
              ) : null}
            </div>
          </div>

          <div className="col-lg-5">
            <div className="border p-4 sticky-top" style={{ top: 100 }}>
              <h5 className="text-uppercase small fw-semibold mb-4">Order Summary</h5>
              {items.map((item) => {
                const unit = getCartItemUnitPrice(item);
                return (
                  <div key={item.id} className="d-flex justify-content-between small mb-2">
                    <span>
                      {item.name} × {item.quantity}
                      {(item.color || item.size) ? (
                        <span className="text-muted">
                          {' '}
                          ({[item.color && `Color: ${item.color}`, item.size && `Size: ${item.size}`].filter(Boolean).join(' · ')})
                        </span>
                      ) : null}
                    </span>
                    <span>{formatPrice(unit * item.quantity, 'INR', 2)}</span>
                  </div>
                );
              })}
              <hr />
              <div className="d-flex gap-2 mb-2">
                <input
                  className="form-control form-control-sm text-uppercase"
                  placeholder="Coupon code"
                  value={couponCode}
                  disabled={!!appliedCoupon || couponLoading}
                  onChange={(e) => setCouponCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!appliedCoupon) applyCoupon();
                    }
                  }}
                />
                {appliedCoupon ? (
                  <Button variant="outline" onClick={clearCoupon}>
                    Remove
                  </Button>
                ) : (
                  <Button variant="outline" loading={couponLoading} onClick={applyCoupon}>
                    Apply
                  </Button>
                )}
              </div>
              {appliedCoupon ? (
                <p className="small text-success mb-3">
                  {appliedCoupon.code}
                  {appliedCoupon.label ? ` · ${appliedCoupon.label}` : ''}
                </p>
              ) : (
                <div className="mb-3" />
              )}
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal, 'INR', 2)}</span>
              </div>
              {discount > 0 && (
                <div className="d-flex justify-content-between mb-2 text-success">
                  <span>
                    Discount
                    {appliedCoupon?.type === 'percentage'
                      ? ` (${appliedCoupon.value}%)`
                      : appliedCoupon?.type === 'fixed'
                        ? ' (flat)'
                        : ''}
                  </span>
                  <span>-{formatPrice(discount, 'INR', 2)}</span>
                </div>
              )}
              <div className="d-flex justify-content-between mb-2 text-muted small">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : formatPrice(shipping, 'INR', 2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 text-muted small">
                <span>{tax > 0 ? 'GST (18%)' : 'GST'}</span>
                <span>{tax > 0 ? formatPrice(tax, 'INR', 2) : 'Not applicable'}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between fw-semibold mb-4">
                <span>Total</span>
                <span>{formatPrice(total, 'INR', 2)}</span>
              </div>
              <Button
                className="w-100"
                loading={loading}
                onClick={payNow}
                disabled={
                  !selectedAddressId ||
                  (paymentChoice === 'online' ? !gatewayReady : !codEligible)
                }
              >
                {paymentChoice === 'cod' ? 'Place COD Order' : 'Pay Now'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        show={showChangeModal}
        onClose={closeModal}
        title={modalMode === 'edit' ? 'Edit Address' : modalMode === 'add' ? 'Add Address' : 'Change Address'}
        size="modal-lg"
      >
        {modalMode === 'list' ? (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <p className="small text-muted mb-0">Select a delivery address or edit an existing one.</p>
              <Button variant="outline" onClick={() => setModalMode('add')}>
                + Add New
              </Button>
            </div>
            <div className="d-flex flex-column gap-2">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`border p-3 d-flex gap-3 align-items-start ${
                    Number(selectedAddressId) === Number(addr.id) ? 'border-dark' : ''
                  }`}
                >
                  <input
                    type="radio"
                    className="mt-1"
                    name="checkout-address"
                    checked={Number(selectedAddressId) === Number(addr.id)}
                    onChange={() => setSelectedAddressId(addr.id)}
                  />
                  <div className="flex-grow-1">
                    <div className="fw-semibold">{addr.name || addr.full_name}</div>
                    <div className="small text-muted">{formatAddress(addr)}</div>
                  </div>
                  <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => openEditAddress(addr)}>
                    Edit
                  </button>
                </div>
              ))}
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!selectedAddressId) {
                    toast.error('Select an address');
                    return;
                  }
                  closeModal();
                }}
              >
                Deliver Here
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <button
              type="button"
              className="btn btn-link btn-sm p-0 mb-3 text-decoration-none"
              onClick={() => {
                setModalMode(addresses.length ? 'list' : 'add');
                setEditingAddress(null);
                if (!addresses.length) closeModal();
              }}
            >
              ← Back
            </button>
            <AddressForm
              key={editingAddress?.id || 'new-address'}
              defaultValues={
                editingAddress
                  ? {
                      name: editingAddress.name || editingAddress.full_name || '',
                      phone: normalizePhone(editingAddress.phone),
                      address_line1: editingAddress.address_line1 || '',
                      address_line2: editingAddress.address_line2 || '',
                      city: editingAddress.city || '',
                      state: editingAddress.state || '',
                      pincode: editingAddress.pincode || '',
                      is_default: Boolean(editingAddress.is_default),
                    }
                  : { is_default: addresses.length === 0 }
              }
              onSubmit={saveAddress}
              loading={addressSaving}
            />
          </div>
        )}
      </Modal>
    </>
  );
}
