import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Button from '../ui/Button';
import Loader from '../common/Loader';
import Modal from '../ui/Modal';
import { orderService, paymentService } from '../../services/orderService';
import api from '../../services/api';
import { openCashfreeCheckout } from '../../utils/cashfreeCheckout';
import { formatDate, getProductImage } from '../../utils/helpers';
import { formatPrice } from '../../utils/formatPrice';
import useAuth from '../../hooks/useAuth';

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

/**
 * Inline order detail for Profile → Orders (keeps profile sidebar).
 */
export default function ProfileOrderDetail({ orderId, onBack, onOrderUpdated }) {
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [submittingQuery, setSubmittingQuery] = useState(false);
  const [querySubject, setQuerySubject] = useState('Request for tracking details');
  const [queryMessage, setQueryMessage] = useState(
    'Please share the tracking number and tracking link for my order.'
  );

  const load = async () => {
    setLoading(true);
    try {
      const [orderRes, trackRes] = await Promise.all([
        orderService.getOrder(orderId),
        orderService.trackOrder(orderId).catch(() => null),
      ]);
      setOrder(orderRes.data?.data ?? null);
      setTracking(trackRes?.data?.data ?? null);
    } catch {
      setOrder(null);
      setTracking(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const cancelOrder = async () => {
    setCancelling(true);
    try {
      await orderService.cancelOrder(orderId);
      toast.success('Order cancelled');
      await load();
      onOrderUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not cancel');
    } finally {
      setCancelling(false);
    }
  };

  const payNow = async () => {
    setPaying(true);
    try {
      const payRes = await paymentService.initiateCashfree(orderId);
      const pay = payRes.data?.data;
      if (!pay?.payment_session_id) {
        throw new Error('Could not start Cashfree checkout');
      }
      await openCashfreeCheckout({
        paymentSessionId: pay.payment_session_id,
        env: pay.env || 'sandbox',
      });
    } catch (err) {
      toast.error(err.response?.data?.message ?? err.message ?? 'Could not start payment');
    } finally {
      setPaying(false);
    }
  };

  const delivery = order?.delivery || tracking?.delivery || null;
  const trackingNumber = delivery?.tracking_number || tracking?.tracking_number || '';
  const hasTracking = Boolean(trackingNumber);
  const pendingFollowup = order?.tracking_followup?.status === 'pending';

  const trackLink = useMemo(() => {
    if (!order?.order_number) return '';
    const email = encodeURIComponent(order.customer_email || user?.email || '');
    return `/track-order?order=${encodeURIComponent(order.order_number)}&email=${email}`;
  }, [order, user]);

  const openRaiseQuery = () => {
    setQuerySubject('Request for tracking details');
    setQueryMessage(
      `Please share the tracking number and tracking link for order #${order?.order_number || orderId}.`
    );
    setShowQueryModal(true);
  };

  const submitRaiseQuery = async () => {
    if (!queryMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    setSubmittingQuery(true);
    try {
      await api.post('/followups/tracking', {
        order_id: Number(orderId),
        subject: querySubject.trim() || 'Request for tracking details',
        message: queryMessage.trim(),
      });
      toast.success('Tracking query sent. We will email you once tracking is shared.');
      setShowQueryModal(false);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not submit query');
    } finally {
      setSubmittingQuery(false);
    }
  };

  if (loading) return <Loader />;
  if (!order) {
    return (
      <div className="text-center py-4">
        <p className="text-muted mb-3">Order not found.</p>
        <Button variant="outline" onClick={onBack}>
          Back to Orders
        </Button>
      </div>
    );
  }

  const items = order.items ?? order.order_items ?? [];
  const shipping =
    typeof order.shipping_address === 'string'
      ? (() => {
          try {
            return JSON.parse(order.shipping_address);
          } catch {
            return null;
          }
        })()
      : order.shipping_address;

  const canPay =
    order.payment_status !== 'paid' &&
    order.status === 'pending' &&
    (order.payment_method === 'cashfree' || !order.payment_method);

  const canRaiseQuery =
    !hasTracking &&
    !['cancelled', 'refunded'].includes(order.status) &&
    !pendingFollowup;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start gap-3 mb-4 flex-wrap">
        <div>
          <button
            type="button"
            className="btn btn-link btn-sm p-0 mb-2 text-decoration-none"
            onClick={onBack}
          >
            ← Back to Orders
          </button>
          <h3 className="h5 mb-1">Order #{order.order_number ?? order.id}</h3>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <span
              className={`badge bg-${STATUS_COLORS[order.status] ?? 'secondary'} rounded-0 text-uppercase`}
              style={{ fontSize: '0.625rem' }}
            >
              {order.status}
            </span>
            <span className="small text-muted text-capitalize">
              Payment: {order.payment_status ?? 'pending'}
            </span>
            {hasTracking ? (
              <Link to={trackLink} className="btn btn-sm btn-outline-dark">
                Track order
              </Link>
            ) : canRaiseQuery ? (
              <button type="button" className="btn btn-sm btn-outline-dark" onClick={openRaiseQuery}>
                Raise query for tracking order
              </button>
            ) : pendingFollowup ? (
              <span className="badge bg-warning text-dark rounded-0 text-uppercase" style={{ fontSize: '0.625rem' }}>
                Tracking query pending
              </span>
            ) : null}
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {canPay && (
            <Button loading={paying} onClick={payNow}>
              Pay Now
            </Button>
          )}
          {order.status === 'pending' && (
            <Button variant="outline" loading={cancelling} onClick={cancelOrder}>
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <h4 className="text-uppercase small fw-semibold mb-3">Items</h4>
          {items.map((item) => (
            <div key={item.id} className="d-flex gap-3 border-bottom py-3">
              <img
                src={getProductImage(item)}
                alt={item.name ?? item.product_name}
                style={{ width: 72, aspectRatio: '3/4', objectFit: 'cover' }}
              />
              <div className="flex-grow-1">
                <div className="fw-medium">{item.name ?? item.product_name}</div>
                <div className="small text-muted">
                  Qty: {item.quantity}
                  {item.color ? ` · Color: ${item.color}` : ''}
                  {item.size ? ` · Size: ${item.size}` : ''}
                </div>
              </div>
              <div>{formatPrice(item.total ?? item.price * item.quantity)}</div>
            </div>
          ))}

          <div className="mt-4">
            <h4 className="text-uppercase small fw-semibold mb-3">Tracking</h4>
            <div className="border p-3">
              <p className="mb-1">
                <strong>Status:</strong> {order.status}
              </p>
              {hasTracking ? (
                <>
                  {delivery?.carrier ? (
                    <p className="mb-1">
                      <strong>Carrier:</strong> {delivery.carrier}
                    </p>
                  ) : null}
                  <p className="mb-1">
                    <strong>Tracking #:</strong> {trackingNumber}
                  </p>
                  <p className="mb-0">
                    <strong>Tracking link:</strong>{' '}
                    <Link to={trackLink}>Open track order</Link>
                  </p>
                </>
              ) : (
                <>
                  <p className="small text-muted mb-2">
                    Tracking details have not been shared yet.
                  </p>
                  {pendingFollowup ? (
                    <p className="small mb-0 text-warning">
                      Your tracking query is pending. We will update you soon.
                    </p>
                  ) : canRaiseQuery ? (
                    <Button variant="outline" onClick={openRaiseQuery}>
                      Raise query for tracking order
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="border p-3 p-md-4">
            <h4 className="text-uppercase small fw-semibold mb-3">Summary</h4>
            <div className="small mb-2">
              <strong>Date:</strong> {formatDate(order.created_at)}
            </div>
            <div className="small mb-2">
              <strong>Status:</strong> {order.status}
            </div>
            <div className="small mb-2">
              <strong>Payment:</strong> {order.payment_method ?? 'N/A'} ({order.payment_status ?? 'pending'})
            </div>
            {shipping && (
              <div className="small mb-2">
                <strong>Ship to:</strong>
                <div className="text-muted mt-1">
                  {shipping.name || shipping.full_name}
                  <br />
                  {shipping.address_line1}
                  {shipping.address_line2 ? `, ${shipping.address_line2}` : ''}
                  <br />
                  {shipping.city}, {shipping.state} {shipping.pincode}
                  {shipping.phone ? (
                    <>
                      <br />
                      Phone: {shipping.phone}
                    </>
                  ) : null}
                </div>
              </div>
            )}
            <hr />
            <div className="d-flex justify-content-between fw-semibold">
              <span>Total</span>
              <span>{formatPrice(order.total_amount ?? order.total)}</span>
            </div>
            {canPay && (
              <Button className="w-100 mt-3" loading={paying} onClick={payNow}>
                Complete Payment
              </Button>
            )}
          </div>
        </div>
      </div>

      <Modal
        show={showQueryModal}
        onClose={() => !submittingQuery && setShowQueryModal(false)}
        title="Raise tracking query"
      >
        <div className="mb-3 small text-muted">
          <div>
            <strong>Order:</strong> #{order.order_number}
          </div>
          <div>
            <strong>Status:</strong> {order.status}
          </div>
          <div>
            <strong>Total:</strong> {formatPrice(order.total_amount ?? order.total)}
          </div>
          <div>
            <strong>Email:</strong> {order.customer_email || user?.email || '—'}
          </div>
        </div>
        <div className="mb-3">
          <label className="form-label">Subject</label>
          <input
            className="form-control"
            value={querySubject}
            onChange={(e) => setQuerySubject(e.target.value)}
            disabled={submittingQuery}
          />
        </div>
        <div className="mb-4">
          <label className="form-label">Message</label>
          <textarea
            className="form-control"
            rows={4}
            value={queryMessage}
            onChange={(e) => setQueryMessage(e.target.value)}
            disabled={submittingQuery}
          />
        </div>
        <div className="d-flex justify-content-end gap-2">
          <Button variant="outline" disabled={submittingQuery} onClick={() => setShowQueryModal(false)}>
            Cancel
          </Button>
          <Button loading={submittingQuery} onClick={submitRaiseQuery}>
            Send query
          </Button>
        </div>
      </Modal>
    </div>
  );
}
