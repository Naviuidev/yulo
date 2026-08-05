import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { orderService } from '../../services/orderService';
import { formatDate } from '../../utils/helpers';
import { formatPrice } from '../../utils/formatPrice';

const STATUS_COLORS = {
  pending: 'warning',
  processing: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'danger',
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderService.getOrders()
      .then((r) => setOrders(r.data?.data ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <SEO title="My Orders" />
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ label: 'Orders' }]} />
          <h1>My Orders</h1>
        </div>
      </div>

      <div className="container py-5">
        {loading ? <Loader fullScreen /> : orders.length === 0 ? (
          <EmptyState icon="bi-box" title="No orders yet" message="When you place an order, it will appear here." actionLabel="Start Shopping" actionTo="/shop" />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr className="text-uppercase small">
                  <th>Order</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="fw-medium">#{order.order_number ?? order.id}</td>
                    <td className="text-muted small">{formatDate(order.created_at)}</td>
                    <td>
                      <span className={`badge bg-${STATUS_COLORS[order.status] ?? 'secondary'} rounded-0 text-uppercase`} style={{ fontSize: '0.625rem' }}>
                        {order.status}
                      </span>
                    </td>
                    <td>{formatPrice(order.total_amount ?? order.total)}</td>
                    <td>
                      <Link to={`/orders/${order.id}`} className="btn btn-sm btn-outline-dark">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
