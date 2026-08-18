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
  const [updatingReturn, setUpdatingReturn] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  const [notifyReturnEmail, setNotifyReturnEmail] = useState(true);
  const [markRefunded, setMarkRefunded] = useState(false);
  const [helpReply, setHelpReply] = useState('');
  const [sendingHelp, setSendingHelp] = useState(false);

  const busy = updating || sharingTracking || updatingReturn || sendingHelp;

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

  useEffect(() => {
    setReturnNotes(order?.return?.admin_notes || '');
    setNotifyReturnEmail(true);
    setMarkRefunded(false);
  }, [order?.return?.id, order?.return?.admin_notes]);

  const openStatusConfirm = (status) => {
    if (!order || order.status === status || busy) return;
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
    if (!order || busy) return;
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

  const handleReturnUpdate = async (status) => {
    if (!order?.return || updatingReturn) return;
    setUpdatingReturn(true);
    try {
      const result = await orderService.updateReturn(id, {
        status,
        admin_notes: returnNotes.trim() || undefined,
        notify_customer: notifyReturnEmail,
        mark_order_returned: true,
        mark_refunded: status === 'completed' ? markRefunded : false,
      });
      const labels = {
        in_process: 'Return kept in process',
        rejected: 'Return rejected',
        completed: 'Return completed',
      };
      toast.success(labels[status] || 'Return updated');
      if (notifyReturnEmail) {
        if (result?.email_sent) {
          toast.success(result.email_message || 'Customer notified');
        } else {
          toast.info(result?.email_message || 'Updated, but email was not sent');
        }
      }
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update return');
    } finally {
      setUpdatingReturn(false);
    }
  };

  const sendHelpReply = async () => {
    if (!helpReply.trim() || sendingHelp) return;
    setSendingHelp(true);
    try {
      const result = await orderService.sendHelp(id, { message: helpReply.trim() });
      toast.success('Reply shared with customer');
      setHelpReply('');
      if (result?.help_messages) {
        setOrder((prev) => (prev ? { ...prev, help_messages: result.help_messages } : prev));
      } else {
        await load();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSendingHelp(false);
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
                  {(order.items || []).map((item) => {
                    const meta = [item.color && `Color: ${item.color}`, item.size && `Size: ${item.size}`]
                      .filter(Boolean)
                      .join(' · ');
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="fw-medium">{item.product_name || item.name}</div>
                          {meta ? <div className="small text-muted mt-1">{meta}</div> : null}
                        </td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.price)}</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    );
                  })}
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
                disabled={busy}
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
                    disabled={busy || order.status === s}
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
                    disabled={busy || order.status === s}
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
                <dd className="col-7">{formatCurrency(order.shipping_amount ?? order.shipping_charge)}</dd>
                <dt className="col-5 text-muted">Discount</dt>
                <dd className="col-7">{formatCurrency(order.discount_amount ?? order.discount)}</dd>
                <dt className="col-5 text-muted fw-bold">Total</dt>
                <dd className="col-7 fw-bold text-gold">{formatCurrency(order.total)}</dd>
                <dt className="col-5 text-muted">Payment</dt>
                <dd className="col-7">
                  <StatusBadge status={order.payment_status} />
                </dd>
              </dl>
            </div>
          </div>

          {order.return ? (
            <div className="yulo-card mb-4">
              <div className="yulo-card-header">
                <h5>Return</h5>
              </div>
              <div className="yulo-card-body small">
                <p className="mb-2">
                  <span className="btn btn-dark btn-sm rounded-pill py-0 px-3" style={{ pointerEvents: 'none' }}>
                    {order.return.status === 'in_process'
                      ? 'In process'
                      : String(order.return.status || '').replace(/_/g, ' ')}
                  </span>
                </p>
                <p className="mb-1 text-muted">
                  Requested {order.return.created_at ? formatDateTime(order.return.created_at) : '—'}
                </p>
                <p className="mb-3">
                  <strong>Customer reason:</strong> {order.return.reason || '—'}
                </p>

                {order.has_open_return ? (
                  <>
                    <div className="mb-3">
                      <label className="form-label" htmlFor="return-admin-notes">
                        Admin notes (optional)
                      </label>
                      <textarea
                        id="return-admin-notes"
                        className="form-control form-control-sm"
                        rows={3}
                        value={returnNotes}
                        onChange={(e) => setReturnNotes(e.target.value)}
                        disabled={updatingReturn}
                        placeholder="Shared with customer when you notify them"
                      />
                    </div>
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="notify-return-email"
                        checked={notifyReturnEmail}
                        onChange={(e) => setNotifyReturnEmail(e.target.checked)}
                        disabled={updatingReturn || !customerEmail}
                      />
                      <label className="form-check-label" htmlFor="notify-return-email">
                        Email customer
                      </label>
                    </div>
                    <div className="form-check mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="mark-refunded-on-complete"
                        checked={markRefunded}
                        onChange={(e) => setMarkRefunded(e.target.checked)}
                        disabled={updatingReturn}
                      />
                      <label className="form-check-label" htmlFor="mark-refunded-on-complete">
                        On complete: also mark payment refunded
                      </label>
                    </div>
                    <div className="d-flex flex-column gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-dark"
                        disabled={updatingReturn}
                        onClick={() => handleReturnUpdate('in_process')}
                      >
                        {updatingReturn ? 'Saving…' : 'Save notes / keep in process'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        disabled={updatingReturn}
                        onClick={() => handleReturnUpdate('rejected')}
                      >
                        Reject return
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-dark"
                        disabled={updatingReturn}
                        onClick={() => handleReturnUpdate('completed')}
                      >
                        Complete return
                      </button>
                    </div>
                    <p className="text-muted mb-0 mt-2" style={{ fontSize: '0.75rem' }}>
                      Complete sets order status to Returned and restores stock once.
                    </p>
                  </>
                ) : (
                  <p className="mb-0 text-muted">
                    {order.return.admin_notes ? (
                      <>
                        <strong>Admin notes:</strong> {order.return.admin_notes}
                      </>
                    ) : (
                      'This return is closed.'
                    )}
                  </p>
                )}
              </div>
            </div>
          ) : null}

          <div className="yulo-card mb-4">
            <div className="yulo-card-header">
              <h5>Shared messages</h5>
            </div>
            <div className="yulo-card-body small">
              {(order.help_messages || []).length === 0 ? (
                <p className="text-muted mb-3">
                  No customer help messages yet. When the customer uses Help on this order, messages appear here.
                </p>
              ) : (
                <div className="d-flex flex-column gap-3 mb-3" style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {(order.help_messages || []).map((msg) => (
                    <div key={msg.id} className="border-bottom pb-2">
                      <div className="d-flex justify-content-between gap-2">
                        <strong className="text-capitalize">
                          {msg.sender === 'admin' ? 'YULO (you)' : 'Customer'}
                        </strong>
                        <span className="text-muted">
                          {msg.created_at ? formatDateTime(msg.created_at) : ''}
                        </span>
                      </div>
                      <div className="mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <label className="form-label" htmlFor="admin-help-reply">
                Reply to customer
              </label>
              <textarea
                id="admin-help-reply"
                className="form-control form-control-sm mb-2"
                rows={3}
                value={helpReply}
                onChange={(e) => setHelpReply(e.target.value)}
                disabled={sendingHelp}
                placeholder="Shared with the customer on their order page"
              />
              <button
                type="button"
                className="btn btn-sm btn-dark"
                disabled={sendingHelp || !helpReply.trim()}
                onClick={sendHelpReply}
              >
                {sendingHelp ? 'Sending…' : 'Send reply'}
              </button>
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
                disabled={busy}
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
