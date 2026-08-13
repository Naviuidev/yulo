import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Loader from '../../components/common/Loader';
import ConfirmModal from '../../components/common/ConfirmModal';
import orderService from '../../services/orderService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { ORDER_STATUS_LABELS } from '../../utils/constants';

const WORKFLOW = ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
const SPECIAL = ['cancelled', 'returned', 'refunded'];

const OrderDetail = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [notifyTrackingEmail, setNotifyTrackingEmail] = useState(true);
  const [sharingTracking, setSharingTracking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await orderService.get(id);
      setOrder(data);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const openStatusConfirm = (status) => {
    if (!order || order.status === status || updating || sharingTracking) return;
    setPendingStatus(status);
    setNotifyCustomer(true);
  };

  const closeStatusConfirm = () => {
    if (updating) return;
    setPendingStatus(null);
  };

  const confirmStatusUpdate = async () => {
    if (!pendingStatus) return;
    setUpdating(true);
    try {
      const result = await orderService.updateStatus(id, pendingStatus, {
        notify_customer: notifyCustomer,
      });
      toast.success(`Order marked as ${ORDER_STATUS_LABELS[pendingStatus] || pendingStatus}`);
      if (notifyCustomer) {
        if (result?.email_sent) {
          toast.success(result.email_message || 'Status email sent to customer');
        } else {
          toast.info(result?.email_message || 'Status updated, but email was not sent');
        }
      }
      setPendingStatus(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const openTrackingModal = () => {
    if (!order || updating || sharingTracking) return;
    setTrackingNumber(order.delivery?.tracking_number || '');
    setCarrier(order.delivery?.carrier || '');
    setNotifyTrackingEmail(true);
    setShowTrackingModal(true);
  };

  const closeTrackingModal = () => {
    if (sharingTracking) return;
    setShowTrackingModal(false);
  };

  const confirmShareTracking = async () => {
    const tracking = trackingNumber.trim();
    if (!tracking) {
      toast.error('Enter a tracking number');
      return;
    }

    setSharingTracking(true);
    try {
      const result = await orderService.shareTracking(id, {
        tracking_number: tracking,
        carrier: carrier.trim() || undefined,
        notify_customer: notifyTrackingEmail,
        mark_shipped: true,
      });
      toast.success('Tracking saved');
      if (notifyTrackingEmail) {
        if (result?.email_sent) {
          toast.success(result.email_message || 'Tracking email sent to customer');
        } else {
          toast.info(result?.email_message || 'Tracking saved, but email was not sent');
        }
      }
      setShowTrackingModal(false);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to share tracking');
    } finally {
      setSharingTracking(false);
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!order) {
    return (
      <div className="yulo-empty">
        Order not found. <Link to="/orders">Back to orders</Link>
      </div>
    );
  }

  const customerEmail = order.customer_email || order.shipping_email || '';
  const pendingLabel = pendingStatus ? ORDER_STATUS_LABELS[pendingStatus] || pendingStatus : '';
  const currentTracking = order.delivery?.tracking_number;

  return (
    <>
      <Helmet>
        <title>Order {order.order_number} — YULO Admin</title>
      </Helmet>
      <PageHeader
        title={`Order ${order.order_number}`}
        subtitle={`Placed ${formatDateTime(order.created_at)}`}
        breadcrumbs={
          <Link to="/orders" className="text-muted text-decoration-none">
            Orders
          </Link>
        }
        actions={<StatusBadge status={order.status} />}
      />

      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="yulo-card mb-4">
            <div className="yulo-card-header">
              <h5>Order Items</h5>
            </div>
            <div className="table-responsive">
              <table className="table yulo-table mb-0">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.product_name || item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.price)}</td>
                      <td>{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="yulo-card">
            <div className="yulo-card-header d-flex justify-content-between align-items-center gap-2 flex-wrap">
              <h5 className="mb-0">Update Status</h5>
              <button
                type="button"
                className="btn btn-sm btn-outline-dark"
                onClick={openTrackingModal}
                disabled={updating || sharingTracking}
              >
                Share Tracking Order
              </button>
            </div>
            <div className="yulo-card-body">
              {currentTracking ? (
                <p className="small text-muted mb-3">
                  Current tracking: <strong>{currentTracking}</strong>
                  {order.delivery?.carrier ? ` · ${order.delivery.carrier}` : ''}
                </p>
              ) : null}
              <p className="small text-muted mb-3">Workflow progression</p>
              <div className="yulo-status-flow mb-3">
                {WORKFLOW.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`yulo-status-chip ${order.status === s ? 'is-active' : ''}`}
                    disabled={updating || sharingTracking || order.status === s}
                    onClick={() => openStatusConfirm(s)}
                  >
                    {ORDER_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
              <p className="small text-muted mb-2">Special actions</p>
              <div className="yulo-status-flow">
                {SPECIAL.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`yulo-status-chip yulo-status-chip--${s === 'cancelled' ? 'danger' : 'muted'} ${
                      order.status === s ? 'is-active' : ''
                    }`}
                    disabled={updating || sharingTracking || order.status === s}
                    onClick={() => openStatusConfirm(s)}
                  >
                    {ORDER_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="yulo-card mb-4">
            <div className="yulo-card-header">
              <h5>Summary</h5>
            </div>
            <div className="yulo-card-body">
              <dl className="row mb-0 small">
                <dt className="col-5 text-muted">Subtotal</dt>
                <dd className="col-7">{formatCurrency(order.subtotal)}</dd>
                <dt className="col-5 text-muted">Shipping</dt>
                <dd className="col-7">{formatCurrency(order.shipping_amount)}</dd>
                <dt className="col-5 text-muted">Discount</dt>
                <dd className="col-7">{formatCurrency(order.discount_amount)}</dd>
                <dt className="col-5 text-muted fw-bold">Total</dt>
                <dd className="col-7 fw-bold text-gold">{formatCurrency(order.total)}</dd>
                <dt className="col-5 text-muted">Payment</dt>
                <dd className="col-7">
                  <StatusBadge status={order.payment_status} />
                </dd>
              </dl>
            </div>
          </div>

          <div className="yulo-card">
            <div className="yulo-card-header">
              <h5>Customer</h5>
            </div>
            <div className="yulo-card-body">
              <p className="mb-1 fw-medium">{order.customer_name || order.shipping_name}</p>
              <p className="mb-0 small text-muted">{customerEmail}</p>
              {order.shipping_phone && <p className="mb-0 small text-muted mt-1">{order.shipping_phone}</p>}
              <button
                type="button"
                className="btn btn-sm btn-gold mt-3"
                onClick={openTrackingModal}
                disabled={updating || sharingTracking}
              >
                Share Tracking Order
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        show={!!pendingStatus}
        title="Update order status"
        message={`Change status to “${pendingLabel}”?`}
        confirmLabel={updating ? 'Updating…' : 'Confirm update'}
        cancelLabel="Cancel"
        variant="dark"
        confirmDisabled={updating}
        onConfirm={confirmStatusUpdate}
        onCancel={closeStatusConfirm}
      >
        <div className="mt-3 pt-3 border-top">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="notify-customer-email"
              checked={notifyCustomer}
              onChange={(e) => setNotifyCustomer(e.target.checked)}
              disabled={updating || !customerEmail}
            />
            <label className="form-check-label" htmlFor="notify-customer-email">
              Share update email with the customer
            </label>
          </div>
          {customerEmail ? (
            <p className="small text-muted mb-0 mt-2">
              Email will be sent to <strong>{customerEmail}</strong>.
            </p>
          ) : (
            <p className="small text-danger mb-0 mt-2">No customer email on this order.</p>
          )}
        </div>
      </ConfirmModal>

      <ConfirmModal
        show={showTrackingModal}
        title="Share tracking order"
        message="Enter the tracking number to save and share with the customer."
        confirmLabel={sharingTracking ? 'Sharing…' : 'Share tracking'}
        cancelLabel="Cancel"
        variant="dark"
        confirmDisabled={sharingTracking || !trackingNumber.trim()}
        onConfirm={confirmShareTracking}
        onCancel={closeTrackingModal}
      >
        <div className="mt-3 pt-3 border-top">
          <div className="mb-3">
            <label className="form-label" htmlFor="tracking-number">
              Tracking number
            </label>
            <input
              id="tracking-number"
              className="form-control"
              placeholder="e.g. AWB / courier tracking ID"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              disabled={sharingTracking}
              autoFocus
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="tracking-carrier">
              Carrier (optional)
            </label>
            <input
              id="tracking-carrier"
              className="form-control"
              placeholder="e.g. Delhivery, BlueDart"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              disabled={sharingTracking}
            />
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="notify-tracking-email"
              checked={notifyTrackingEmail}
              onChange={(e) => setNotifyTrackingEmail(e.target.checked)}
              disabled={sharingTracking || !customerEmail}
            />
            <label className="form-check-label" htmlFor="notify-tracking-email">
              Email tracking link to the customer
            </label>
          </div>
          {customerEmail ? (
            <p className="small text-muted mb-0 mt-2">
              Customer will receive tracking details at <strong>{customerEmail}</strong> with a Track Order link.
            </p>
          ) : (
            <p className="small text-danger mb-0 mt-2">No customer email on this order.</p>
          )}
        </div>
      </ConfirmModal>
    </>
  );
};

export default OrderDetail;
