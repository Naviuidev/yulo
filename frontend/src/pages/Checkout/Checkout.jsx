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
import { formatPrice, getCartItemUnitPrice } from '../../utils/formatPrice';
import { couponService, orderService } from '../../services/orderService';
import { addressService } from '../../services/contentService';
import { openCashfreeCheckout } from '../../utils/cashfreeCheckout';

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
  const { items, subtotal } = useCart();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);

  const [showChangeModal, setShowChangeModal] = useState(false);
  const [modalMode, setModalMode] = useState('list'); // list | add | edit
  const [editingAddress, setEditingAddress] = useState(null);

  const shipping = subtotal >= 999 ? 0 : 99;
  // Match backend Cashfree total: sale subtotal − discount + shipping + 18% GST.
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round(taxable * 0.18 * 100) / 100;
  const total = Math.max(0, Math.round((taxable + shipping + tax) * 100) / 100);

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

    setLoading(true);
    try {
      const res = await orderService.checkoutCashfree({
        shipping_address_id: selectedAddressId,
        coupon_code: couponCode || undefined,
        shipping_charge: shipping,
      });
      const pay = res.data?.data;
      const sessionId = pay?.payment_session_id;
      if (!sessionId) {
        throw new Error('Could not start Cashfree checkout. Check Admin → Payments credentials.');
      }

      await openCashfreeCheckout({
        paymentSessionId: sessionId,
        env: pay?.env || 'sandbox',
      });
      // If SDK did not redirect, keep user here with a clear message.
      toast.info('Complete payment in the Cashfree window to confirm your order.');
    } catch (err) {
      toast.error(err.response?.data?.message ?? err.message ?? 'Could not start payment');
    } finally {
      setLoading(false);
    }
  };

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
              <h5 className="text-uppercase small fw-semibold mb-2">Payment</h5>
              <p className="small text-muted mb-0">
                Secure checkout via Cashfree. Click <strong>Pay Now</strong> to open the payment gateway — your order is confirmed only after payment succeeds.
              </p>
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
                    </span>
                    <span>{formatPrice(unit * item.quantity, 'INR', 2)}</span>
                  </div>
                );
              })}
              <hr />
              <div className="d-flex gap-2 mb-3">
                <input
                  className="form-control form-control-sm"
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
                <Button variant="outline" onClick={applyCoupon}>
                  Apply
                </Button>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal, 'INR', 2)}</span>
              </div>
              {discount > 0 && (
                <div className="d-flex justify-content-between mb-2 text-success">
                  <span>Discount</span>
                  <span>-{formatPrice(discount, 'INR', 2)}</span>
                </div>
              )}
              <div className="d-flex justify-content-between mb-2 text-muted small">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : formatPrice(shipping, 'INR', 2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 text-muted small">
                <span>GST (18%)</span>
                <span>{formatPrice(tax, 'INR', 2)}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between fw-semibold mb-4">
                <span>Total</span>
                <span>{formatPrice(total, 'INR', 2)}</span>
              </div>
              <Button className="w-100" loading={loading} onClick={payNow} disabled={!selectedAddressId}>
                Pay Now
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
