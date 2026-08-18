import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Button from '../ui/Button';
import Loader from '../common/Loader';
import Modal from '../ui/Modal';
import { orderService, paymentService } from '../../services/orderService';
import api from '../../services/api';
import { openCashfreeCheckout } from '../../utils/cashfreeCheckout';
import { openPaytmCheckout } from '../../utils/paytmCheckout';
import { openRazorpayCheckout } from '../../utils/razorpayCheckout';
import { openPayUCheckout } from '../../utils/payuCheckout';
import { formatDate, getProductImage } from '../../utils/helpers';
import { formatPrice } from '../../utils/formatPrice';
import { openBlankInvoiceWindow, deliverInvoice } from '../../utils/invoiceDownload';
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
  const [returning, setReturning] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [helpSent, setHelpSent] = useState(false);
  const [sendingHelp, setSendingHelp] = useState(false);
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
      const res = await orderService.cancelOrder(orderId);
      const payload = res?.data?.data || {};
      const message = res?.data?.message || 'Order cancelled';
      if (payload.refunded) {
        toast.success(message);
      } else if (payload.refund_ok === false && order?.payment_status === 'paid') {
        toast.info(message);
      } else {
        toast.success(message);
      }
      await load();
      onOrderUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not cancel');
    } finally {
      setCancelling(false);
    }
  };

  const submitReturn = async () => {
    setReturning(true);
    try {
      await orderService.requestReturn(orderId, {
        reason: returnReason.trim() || undefined,
      });
      toast.success('Return request submitted — in process');
      setShowReturnModal(false);
      setReturnReason('');
      await load();
      onOrderUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not submit return');
    } finally {
      setReturning(false);
    }
  };

  const submitHelp = async () => {
    if (!helpMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    setSendingHelp(true);
    try {
      await orderService.sendHelp(orderId, { message: helpMessage.trim() });
      setHelpMessage('');
      setHelpSent(true);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not send message');
    } finally {
      setSendingHelp(false);
    }
  };

  const downloadInvoice = async () => {
    // Open during the click gesture so browsers don't treat it as a blocked popup.
    const invoiceWindow = openBlankInvoiceWindow();
    if (invoiceWindow) {
      try {
        invoiceWindow.document.write(
          '<p style="font-family:Arial,sans-serif;padding:24px;color:#666;">Preparing invoice…</p>'
        );
      } catch {
        // ignore
      }
    }

    setDownloadingInvoice(true);
    try {
      const res = await orderService.getInvoice(orderId);
      const invoice = res.data?.data ?? null;
      if (!invoice) {
        throw new Error('Invoice data missing');
      }
      const mode = deliverInvoice(invoice, invoiceWindow);
      toast.success(
        mode === 'window'
          ? 'Invoice opened — use Print / Save PDF'
          : 'Invoice file downloaded'
      );
    } catch (err) {
      try {
        invoiceWindow?.close();
      } catch {
        // ignore
      }
      toast.error(err.response?.data?.message ?? err.message ?? 'Could not download invoice');
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const payNow = async () => {
    setPaying(true);
    try {
      let method = order?.payment_method;
      if (!method) {
        const activeRes = await paymentService.getActiveGateway();
        method = activeRes.data?.data?.gateway || 'cashfree';
      }

      if (method === 'phonepe') {
        const payRes = await paymentService.initiatePhonePe(orderId);
        const pay = payRes.data?.data;
        if (!pay?.redirect_url) {
          throw new Error('Could not start PhonePe checkout');
        }
        window.location.href = pay.redirect_url;
        return;
      }

      if (method === 'paytm') {
        const payRes = await paymentService.initiatePaytm(orderId);
        const pay = payRes.data?.data;
        if (!pay?.txn_token || !pay?.mid || !pay?.paytm_order_id) {
          throw new Error('Could not start Paytm checkout');
        }
        await openPaytmCheckout({
          orderId: pay.paytm_order_id,
          txnToken: pay.txn_token,
          amount: pay.amount,
          mid: pay.mid,
          checkoutJsUrl: pay.checkout_js_url,
        });
        return;
      }

      if (method === 'razorpay') {
        const payRes = await paymentService.initiateRazorpay(orderId);
        const pay = payRes.data?.data;
        if (!pay?.razorpay_order_id || !pay?.key_id) {
          throw new Error('Could not start Razorpay checkout');
        }
        await openRazorpayCheckout({
          keyId: pay.key_id,
          amount: pay.amount,
          currency: pay.currency || 'INR',
          orderId: pay.razorpay_order_id,
          description: `Order ${pay.order_number || orderId}`,
          prefill: pay.prefill || {},
          returnUrl: '/payment/razorpay/return',
          yuloOrderId: pay.order_id || orderId,
        });
        return;
      }

      if (method === 'payu') {
        const payRes = await paymentService.initiatePayU(orderId);
        const pay = payRes.data?.data;
        if (!pay?.action || !pay?.params) {
          throw new Error('Could not start PayU checkout');
        }
        openPayUCheckout({ action: pay.action, params: pay.params });
        return;
      }

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
      if (err?.message === 'Payment cancelled') {
        toast.info('Payment cancelled');
      } else {
        toast.error(err.response?.data?.message ?? err.message ?? 'Could not start payment');
      }
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
    (order.payment_method === 'cashfree' ||
      order.payment_method === 'phonepe' ||
      order.payment_method === 'paytm' ||
      order.payment_method === 'razorpay' ||
      order.payment_method === 'payu' ||
      !order.payment_method);

  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const isReturned =
    order.status === 'returned' || order.return?.status === 'completed';
  const returnInProcess =
    Boolean(order.return) && ['requested', 'in_process'].includes(order.return.status);

  // Tracking queries only before delivery — not once delivered/returned/cancelled.
  const canRaiseQuery =
    !hasTracking &&
    !pendingFollowup &&
    !['cancelled', 'refunded', 'delivered', 'returned'].includes(order.status);

  const showCancel = Boolean(order.can_cancel) && !isCancelled;
  // Return only before a return has been decided (rejected/completed = done → use Help).
  const returnStatusDone = ['completed', 'rejected'].includes(String(order.return?.status || ''));
  const showReturn =
    Boolean(order.can_return) &&
    isDelivered &&
    !returnInProcess &&
    !isReturned &&
    !returnStatusDone;
  const showHelp = Boolean(order.can_help) || showReturn || Boolean(order.return);
  const showInvoice = !isCancelled && order.status !== 'refunded';
  const helpMessages = Array.isArray(order.help_messages) ? order.help_messages : [];

  const openHelpModal = () => {
    setHelpSent(false);
    setHelpMessage('');
    setShowHelpModal(true);
  };

  const closeHelpModal = () => {
    if (sendingHelp) return;
    setShowHelpModal(false);
    setHelpSent(false);
    setHelpMessage('');
  };

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
            {hasTracking && !isCancelled ? (
              <Link to={trackLink} className="btn btn-sm btn-outline-dark">
                Track order
              </Link>
            ) : canRaiseQuery ? (
              <button type="button" className="btn btn-sm btn-outline-dark" onClick={openRaiseQuery}>
                Raise query for tracking order
              </button>
            ) : pendingFollowup && !isDelivered && !isCancelled && !isReturned ? (
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
          {showCancel && (
            <Button variant="outline" loading={cancelling} onClick={cancelOrder}>
              Cancel Order
            </Button>
          )}
          {showReturn && (
            <Button variant="outline" loading={returning} onClick={() => setShowReturnModal(true)}>
              Return
            </Button>
          )}
          {showHelp && (
            <Button variant="outline" onClick={openHelpModal}>
              Help
            </Button>
          )}
          {showInvoice && (
            <Button variant="outline" loading={downloadingInvoice} onClick={downloadInvoice}>
              Download Invoice
            </Button>
          )}
        </div>
      </div>

      {isCancelled ? (
        <div className="alert alert-danger rounded-0 border mb-4 py-3">
          <div className="fw-medium mb-1">Order cancelled</div>
          <p className="small mb-0 text-muted">
            {order.payment_status === 'refunded'
              ? 'This prepaid order was cancelled and the refund has been initiated. It may take a few business days to reflect in your account.'
              : order.payment_status === 'paid' &&
                  String(order.payment_method || '').toLowerCase() !== 'cod'
                ? 'This prepaid order was cancelled. If the refund did not go through automatically, our team will process it and update you.'
                : 'This order was cancelled.'}
          </p>
        </div>
      ) : null}

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

          {order.return && !isCancelled ? (
            <div className="mt-4">
              <h4 className="text-uppercase small fw-semibold mb-3">Return status</h4>
              <div className="border p-3">
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {[
                    { key: 'requested', label: 'Requested' },
                    { key: 'in_process', label: 'In process' },
                    { key: 'completed', label: 'Completed' },
                  ].map((step) => {
                    const current = order.return.status === 'requested' ? 'requested' : order.return.status;
                    const orderKeys = ['requested', 'in_process', 'completed'];
                    // Map legacy/requested onto flow; rejected is separate.
                    const activeKey =
                      current === 'rejected'
                        ? null
                        : current === 'requested'
                          ? 'in_process'
                          : current;
                    const activeIdx = orderKeys.indexOf(activeKey || '');
                    const stepIdx = orderKeys.indexOf(step.key);
                    const isActive = activeKey === step.key;
                    const isDone = activeIdx > stepIdx && activeIdx !== -1;
                    return (
                      <span
                        key={step.key}
                        className={`badge rounded-0 text-uppercase ${
                          isActive ? 'bg-dark' : isDone ? 'bg-secondary' : 'bg-light text-muted border'
                        }`}
                        style={{ fontSize: '0.625rem', letterSpacing: '0.04em' }}
                      >
                        {step.label}
                      </span>
                    );
                  })}
                  {order.return.status === 'rejected' ? (
                    <span
                      className="badge bg-danger rounded-0 text-uppercase"
                      style={{ fontSize: '0.625rem', letterSpacing: '0.04em' }}
                    >
                      Rejected
                    </span>
                  ) : null}
                </div>

                <p className="mb-2">
                  <strong>Current status:</strong>{' '}
                  <span className="text-capitalize">
                    {order.return.status === 'in_process' || order.return.status === 'requested'
                      ? 'Return is in process'
                      : order.return.status === 'completed'
                        ? 'Return completed'
                        : order.return.status === 'rejected'
                          ? 'Return not approved'
                          : String(order.return.status || '').replace(/_/g, ' ')}
                  </span>
                </p>
                {order.return.created_at ? (
                  <p className="small text-muted mb-2">
                    Requested on {formatDate(order.return.created_at)}
                    {order.return.reason ? (
                      <>
                        {' '}
                        · Reason: <em>{order.return.reason}</em>
                      </>
                    ) : null}
                  </p>
                ) : null}

                <div className="border bg-light p-3 mt-3">
                  <div className="text-uppercase small fw-semibold mb-2" style={{ letterSpacing: '0.06em' }}>
                    Updates from YULO
                  </div>
                  {order.return.admin_notes ? (
                    <p className="small mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                      {order.return.admin_notes}
                    </p>
                  ) : returnInProcess ? (
                    <p className="small text-muted mb-0">
                      Return is in process. Updates from YULO will be displayed here once our team reviews your
                      request.
                    </p>
                  ) : order.return.status === 'rejected' ? (
                    <p className="small text-muted mb-0">
                      Your previous return was not approved. Use Help to contact YULO about this order.
                    </p>
                  ) : (
                    <p className="small text-muted mb-0">
                      Your return has been completed. Further refund updates from YULO will appear here when
                      available.
                    </p>
                  )}
                </div>

                <div className="border p-3 mt-3">
                  <div className="text-uppercase small fw-semibold mb-2" style={{ letterSpacing: '0.06em' }}>
                    Shared messages with YULO
                  </div>
                  {helpMessages.length === 0 ? (
                    <p className="small text-muted mb-0">
                      No messages yet. Use Help to contact YULO about this order — replies will show here.
                    </p>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {helpMessages.map((msg) => (
                        <div key={msg.id} className="small">
                          <div className="fw-semibold text-capitalize">
                            {msg.sender === 'admin' ? 'YULO' : 'You'}
                            <span className="text-muted fw-normal ms-2">
                              {msg.created_at ? formatDate(msg.created_at) : ''}
                            </span>
                          </div>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            <h4 className="text-uppercase small fw-semibold mb-3">Tracking</h4>
            <div className="border p-3">
              <p className="mb-1">
                <strong>Status:</strong> {order.status}
              </p>
              {isCancelled ? (
                <p className="small text-muted mb-0">Tracking is not available for cancelled orders.</p>
              ) : isDelivered || isReturned ? (
                hasTracking ? (
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
                  <p className="small text-muted mb-0">
                    {isDelivered ? 'This order has been delivered.' : 'This order was returned.'}
                  </p>
                )
              ) : hasTracking ? (
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
            {showInvoice && (
              <Button
                variant="outline"
                className="w-100 mt-2"
                loading={downloadingInvoice}
                onClick={downloadInvoice}
              >
                Download Invoice
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

      <Modal
        show={showReturnModal}
        onClose={() => !returning && setShowReturnModal(false)}
        title="Request a return"
      >
        <p className="small text-muted mb-3">
          Returns are available within {(order.return_window_days ?? 7)} days after delivery when every product in
          the order allows returns. Tell us briefly why you want to return (optional).
        </p>
        <div className="mb-4">
          <label className="form-label" htmlFor="return-reason">
            Reason (optional)
          </label>
          <textarea
            id="return-reason"
            className="form-control"
            rows={4}
            placeholder="e.g. Damaged item, wrong size, defective…"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            disabled={returning}
          />
        </div>
        <div className="d-flex justify-content-end gap-2">
          <Button variant="outline" disabled={returning} onClick={() => setShowReturnModal(false)}>
            Cancel
          </Button>
          <Button loading={returning} onClick={submitReturn}>
            Submit return
          </Button>
        </div>
      </Modal>

      <Modal
        show={showHelpModal}
        onClose={closeHelpModal}
        title="Help — contact YULO"
      >
        {helpSent ? (
          <>
            <p className="mb-4">
              YULO received your response. We will get in touch with you shortly.
            </p>
            <div className="d-flex justify-content-end">
              <Button onClick={closeHelpModal}>Close</Button>
            </div>
          </>
        ) : (
          <>
            <p className="small text-muted mb-3">
              Send a message about order #{order.order_number}. YULO will reply in Shared messages on this order.
            </p>
            {helpMessages.length > 0 ? (
              <div className="border p-3 mb-3" style={{ maxHeight: 180, overflowY: 'auto' }}>
                {helpMessages.map((msg) => (
                  <div key={msg.id} className="small mb-2">
                    <strong>{msg.sender === 'admin' ? 'YULO' : 'You'}:</strong> {msg.message}
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mb-4">
              <label className="form-label" htmlFor="help-message">
                Your message
              </label>
              <textarea
                id="help-message"
                className="form-control"
                rows={4}
                placeholder="How can we help with this order?"
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
                disabled={sendingHelp}
              />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="outline" disabled={sendingHelp} onClick={closeHelpModal}>
                Cancel
              </Button>
              <Button loading={sendingHelp} onClick={submitHelp}>
                Send to YULO
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
