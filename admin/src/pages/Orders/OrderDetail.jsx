import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Loader from '../../components/common/Loader';
import orderService from '../../services/orderService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '../../utils/constants';

const WORKFLOW = ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
const SPECIAL = ['cancelled', 'returned', 'refunded'];

const OrderDetail = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [updating, setUpdating] = useState(false);

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

  useEffect(() => { load(); }, [id]);

  const updateStatus = async (status) => {
    setUpdating(true);
    try {
      await orderService.updateStatus(id, status);
      toast.success(`Order marked as ${ORDER_STATUS_LABELS[status] || status}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!order) return <div className="yulo-empty">Order not found. <Link to="/orders">Back to orders</Link></div>;

  return (
    <>
      <Helmet><title>Order {order.order_number} — YULO Admin</title></Helmet>
      <PageHeader
        title={`Order ${order.order_number}`}
        subtitle={`Placed ${formatDateTime(order.created_at)}`}
        breadcrumbs={<Link to="/orders" className="text-muted text-decoration-none">Orders</Link>}
        actions={<StatusBadge status={order.status} />}
      />

      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="yulo-card mb-4">
            <div className="yulo-card-header"><h5>Order Items</h5></div>
            <div className="table-responsive">
              <table className="table yulo-table mb-0">
                <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
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
            <div className="yulo-card-header"><h5>Update Status</h5></div>
            <div className="yulo-card-body">
              <p className="small text-muted mb-3">Workflow progression</p>
              <div className="yulo-status-flow mb-3">
                {WORKFLOW.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`btn btn-sm ${order.status === s ? 'btn-gold' : 'btn-outline-secondary'}`}
                    disabled={updating || order.status === s}
                    onClick={() => updateStatus(s)}
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
                    className={`btn btn-sm btn-outline-${s === 'cancelled' ? 'danger' : 'dark'}`}
                    disabled={updating}
                    onClick={() => updateStatus(s)}
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
            <div className="yulo-card-header"><h5>Summary</h5></div>
            <div className="yulo-card-body">
              <dl className="row mb-0 small">
                <dt className="col-5 text-muted">Subtotal</dt><dd className="col-7">{formatCurrency(order.subtotal)}</dd>
                <dt className="col-5 text-muted">Shipping</dt><dd className="col-7">{formatCurrency(order.shipping_amount)}</dd>
                <dt className="col-5 text-muted">Discount</dt><dd className="col-7">{formatCurrency(order.discount_amount)}</dd>
                <dt className="col-5 text-muted fw-bold">Total</dt><dd className="col-7 fw-bold text-gold">{formatCurrency(order.total)}</dd>
                <dt className="col-5 text-muted">Payment</dt><dd className="col-7"><StatusBadge status={order.payment_status} /></dd>
              </dl>
            </div>
          </div>

          <div className="yulo-card">
            <div className="yulo-card-header"><h5>Customer</h5></div>
            <div className="yulo-card-body">
              <p className="mb-1 fw-medium">{order.customer_name || order.shipping_name}</p>
              <p className="mb-0 small text-muted">{order.customer_email || order.shipping_email}</p>
              {order.shipping_phone && <p className="mb-0 small text-muted mt-1">{order.shipping_phone}</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderDetail;
