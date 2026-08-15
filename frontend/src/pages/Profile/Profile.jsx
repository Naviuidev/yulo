import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import AddressForm from '../../components/forms/AddressForm';
import Button from '../../components/ui/Button';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import ProfileOrderDetail from '../../components/profile/ProfileOrderDetail';
import useAuth from '../../hooks/useAuth';
import { profileService, addressService } from '../../services/contentService';
import { orderService } from '../../services/orderService';
import { formatDate, getProductImage, resolveMediaUrl } from '../../utils/helpers';
import { formatPrice } from '../../utils/formatPrice';

function orderListImage(order) {
  if (order.product_image) return resolveMediaUrl(order.product_image);
  return getProductImage(order);
}

function orderListTitle(order) {
  const name = order.product_name || order.order_number || `Order #${order.id}`;
  const extra = Number(order.item_count) > 1 ? ` +${Number(order.item_count) - 1} more` : '';
  return `${name}${extra}`;
}

const SECTIONS = [
  { id: 'personal', label: 'Personal Information', icon: 'bi-person' },
  { id: 'addresses', label: 'Saved Addresses', icon: 'bi-geo-alt' },
  { id: 'orders', label: 'Orders', icon: 'bi-bag' },
  { id: 'permissions', label: 'Permissions', icon: 'bi-shield-check' },
];

const STATUS_COLORS = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'info',
  packed: 'primary',
  shipped: 'primary',
  out_for_delivery: 'primary',
  delivered: 'success',
  cancelled: 'danger',
  returned: 'secondary',
  refunded: 'secondary',
};

function normalizePhone(phone) {
  return String(phone || '')
    .replace(/\D/g, '')
    .replace(/^91/, '')
    .slice(-10);
}

function formatAddressLine(addr) {
  if (!addr) return '';
  const line2 = addr.address_line2 ? `, ${addr.address_line2}` : '';
  return `${addr.address_line1}${line2}, ${addr.city}, ${addr.state} ${addr.pincode}`;
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionParam = searchParams.get('section');
  const orderIdParam = searchParams.get('order');
  const activeSection = SECTIONS.some((s) => s.id === sectionParam) ? sectionParam : 'personal';
  const selectedOrderId = activeSection === 'orders' && orderIdParam ? orderIdParam : null;

  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [addressMode, setAddressMode] = useState(null);
  const [savingOptIn, setSavingOptIn] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const marketingOptIn = Boolean(user?.marketing_opt_in ?? true);

  const editingAddress = useMemo(() => {
    if (!addressMode || addressMode === 'new') return null;
    return addresses.find((a) => Number(a.id) === Number(addressMode)) || null;
  }, [addressMode, addresses]);

  const setSection = (id) => {
    if (id === 'personal') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ section: id }, { replace: true });
    }
    if (id !== 'addresses') setAddressMode(null);
  };

  const openOrder = (id) => {
    setSearchParams({ section: 'orders', order: String(id) }, { replace: true });
  };

  const closeOrder = () => {
    setSearchParams({ section: 'orders' }, { replace: true });
  };

  const loadAddresses = useCallback(async () => {
    try {
      const res = await addressService.getAddresses();
      setAddresses(res.data?.data ?? []);
    } catch {
      setAddresses([]);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await orderService.getOrders();
      setOrders(res.data?.data ?? []);
      setOrdersLoaded(true);
    } catch {
      setOrders([]);
      setOrdersLoaded(true);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profileRes] = await Promise.all([
          profileService.getProfile().catch(() => null),
          loadAddresses(),
        ]);
        if (cancelled) return;
        const profileUser = profileRes?.data?.data?.user ?? profileRes?.data?.data;
        if (profileUser?.email || profileUser?.name) {
          reset({
            name: profileUser.name || '',
            email: profileUser.email || '',
            phone: profileUser.phone || '',
          });
        } else if (user) {
          reset({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, reset, loadAddresses]);

  useEffect(() => {
    if (activeSection === 'orders' && !selectedOrderId) {
      loadOrders();
    }
  }, [activeSection, selectedOrderId, loadOrders]);

  const onUpdateProfile = async (data) => {
    setSavingProfile(true);
    try {
      await profileService.updateProfile({
        name: data.name,
        phone: normalizePhone(data.phone),
      });
      await refreshUser?.();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const onSaveAddress = async (data) => {
    setSavingAddress(true);
    try {
      const payload = {
        ...data,
        name: data.name || data.full_name,
        phone: normalizePhone(data.phone),
        is_default: Boolean(data.is_default),
      };
      if (editingAddress?.id) {
        await addressService.updateAddress(editingAddress.id, payload);
      } else {
        await addressService.createAddress(payload);
      }
      await loadAddresses();
      setAddressMode(null);
      toast.success('Address saved');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not save address');
    } finally {
      setSavingAddress(false);
    }
  };

  const deleteAddress = async (id) => {
    try {
      await addressService.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      if (Number(addressMode) === Number(id)) setAddressMode(null);
      toast.info('Address deleted');
    } catch {
      toast.error('Could not delete address');
    }
  };

  const onToggleMarketingOptIn = async () => {
    const next = !marketingOptIn;
    setSavingOptIn(true);
    try {
      await profileService.updateProfile({ marketing_opt_in: next });
      await refreshUser?.();
      toast.success(next ? 'Opted in to promotions' : 'Opted out of promotional emails');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not update preference');
    } finally {
      setSavingOptIn(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <>
      <SEO title={selectedOrderId ? 'Order Details' : 'My Profile'} />
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ label: 'Profile' }]} />
          <h1>My Profile</h1>
          {user?.name ? <p className="text-muted mb-0 mt-2">Welcome back, {user.name}</p> : null}
        </div>
      </div>

      <div className="container py-5">
        <div className="row g-4 g-lg-5">
          <div className="col-lg-3">
            <nav className="profile-nav" aria-label="Profile sections">
              {SECTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`profile-nav__btn ${activeSection === item.id ? 'is-active' : ''}`}
                  onClick={() => setSection(item.id)}
                >
                  <i className={`bi ${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="col-lg-9">
            {activeSection === 'personal' && (
              <section>
                <h2 className="h5 text-uppercase small fw-semibold mb-4">Personal Information</h2>
                <form onSubmit={handleSubmit(onUpdateProfile)} className="yulo-form" style={{ maxWidth: 480 }}>
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input className="form-control" {...register('name', { required: true })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={user?.email || ''}
                      placeholder={user?.email || 'Your email'}
                      readOnly
                      disabled
                      aria-readonly="true"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="form-label">Phone</label>
                    <input className="form-control" placeholder="10-digit mobile" {...register('phone')} />
                  </div>
                  <Button type="submit" loading={savingProfile}>
                    Save Changes
                  </Button>
                </form>
              </section>
            )}

            {activeSection === 'addresses' && (
              <section>
                <div className="d-flex justify-content-between align-items-center gap-3 mb-4 flex-wrap">
                  <h2 className="h5 text-uppercase small fw-semibold mb-0">Saved Addresses</h2>
                  {!addressMode && (
                    <Button variant="outline" onClick={() => setAddressMode('new')}>
                      + Add New Address
                    </Button>
                  )}
                </div>

                {addressMode && (
                  <div className="border p-4 mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h3 className="h6 mb-0">
                        {addressMode === 'new' ? 'Add New Address' : 'Edit Address'}
                      </h3>
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 text-decoration-none"
                        onClick={() => setAddressMode(null)}
                      >
                        Cancel
                      </button>
                    </div>
                    <AddressForm
                      key={addressMode === 'new' ? 'new-address' : `edit-${addressMode}`}
                      loading={savingAddress}
                      onSubmit={onSaveAddress}
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
                    />
                  </div>
                )}

                {addresses.length === 0 && !addressMode ? (
                  <EmptyState
                    icon="bi-geo-alt"
                    title="No saved addresses"
                    message="Add a delivery address to speed up checkout."
                  />
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {addresses.map((addr) => (
                      <div key={addr.id} className="border p-3 p-md-4">
                        <div className="d-flex justify-content-between align-items-start gap-3">
                          <div>
                            <div className="fw-semibold">
                              {addr.name || addr.full_name}
                              {addr.is_default ? (
                                <span
                                  className="badge bg-dark rounded-0 ms-2 text-uppercase"
                                  style={{ fontSize: '0.625rem' }}
                                >
                                  Default
                                </span>
                              ) : null}
                            </div>
                            <p className="small text-muted mb-1 mt-1">{formatAddressLine(addr)}</p>
                            <p className="small text-muted mb-0">Phone: {addr.phone}</p>
                          </div>
                          <div className="d-flex gap-2 flex-shrink-0">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-dark"
                              onClick={() => setAddressMode(addr.id)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => deleteAddress(addr.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!addressMode && addresses.length > 0 && (
                  <div className="mt-4">
                    <Button variant="outline" onClick={() => setAddressMode('new')}>
                      + Add New Address
                    </Button>
                  </div>
                )}
              </section>
            )}

            {activeSection === 'orders' && (
              <section>
                <div className="d-flex justify-content-between align-items-center gap-3 mb-4 flex-wrap">
                  <h2 className="h5 text-uppercase small fw-semibold mb-0">
                    {selectedOrderId ? 'Order Details' : 'My Orders'}
                  </h2>
                  {!selectedOrderId && (
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-decoration-none"
                      onClick={loadOrders}
                      disabled={ordersLoading}
                    >
                      Refresh
                    </button>
                  )}
                </div>

                {selectedOrderId ? (
                  <ProfileOrderDetail
                    orderId={selectedOrderId}
                    onBack={closeOrder}
                    onOrderUpdated={loadOrders}
                  />
                ) : ordersLoading && !ordersLoaded ? (
                  <Loader />
                ) : orders.length === 0 ? (
                  <EmptyState
                    icon="bi-bag"
                    title="No orders yet"
                    message="When you place an order, it will appear here."
                    actionLabel="Start Shopping"
                    actionTo="/shop"
                  />
                ) : (
                  <div className="profile-orders">
                    {orders.map((order) => (
                      <article key={order.id} className="profile-order-row">
                        <img
                          className="profile-order-row__img"
                          src={orderListImage(order)}
                          alt={order.product_name || 'Product'}
                        />
                        <div className="profile-order-row__body">
                          <div className="profile-order-row__title">{orderListTitle(order)}</div>
                          <div className="profile-order-row__meta">
                            <span
                              className={`badge bg-${STATUS_COLORS[order.status] ?? 'secondary'} rounded-0 text-uppercase`}
                              style={{ fontSize: '0.625rem' }}
                            >
                              {order.status}
                            </span>
                            <span className="small text-muted">{formatDate(order.created_at)}</span>
                            <span className="small text-muted text-capitalize">
                              Payment: {order.payment_status ?? 'pending'}
                            </span>
                          </div>
                          <div className="small text-muted">#{order.order_number ?? order.id}</div>
                        </div>
                        <div className="profile-order-row__aside">
                          <div className="fw-semibold">{formatPrice(order.total_amount ?? order.total)}</div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-dark"
                            onClick={() => openOrder(order.id)}
                          >
                            View
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeSection === 'permissions' && (
              <section>
                <h2 className="h5 text-uppercase small fw-semibold mb-3">Permissions</h2>
                <p className="text-muted mb-4" style={{ maxWidth: 560 }}>
                  Control whether YULO can email you promotions, offers, and campaign updates.
                  Your account, orders, and order notifications are never affected by this setting.
                </p>

                <div className="profile-permission-card">
                  <div className="profile-permission-card__copy">
                    <h3 className="h6 mb-2">Promotional emails</h3>
                    <p className="small text-muted mb-2">
                      <strong>Opt in</strong> means you allow YULO to send product launches, discounts,
                      and campaign emails to your registered address.
                    </p>
                    <p className="small text-muted mb-0">
                      <strong>Opt out</strong> means you will not receive marketing or campaign emails.
                      You can still use the store, place orders, and get order-related updates.
                    </p>
                  </div>
                  <div className="profile-permission-card__toggle">
                    <span className="small text-uppercase fw-semibold">
                      {marketingOptIn ? 'Opted in' : 'Opted out'}
                    </span>
                    <button
                      type="button"
                      className={`profile-opt-toggle ${marketingOptIn ? 'is-on' : ''}`}
                      role="switch"
                      aria-checked={marketingOptIn}
                      aria-label="Toggle promotional email opt-in"
                      disabled={savingOptIn}
                      onClick={onToggleMarketingOptIn}
                    >
                      <span className="profile-opt-toggle__knob" />
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
