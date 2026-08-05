import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import Loader from '../../components/common/Loader';
import Button from '../../components/ui/Button';
import { orderService } from '../../services/orderService';
import { formatDate, getProductImage } from '../../utils/helpers';
import { formatPrice } from '../../utils/formatPrice';
import { toast } from 'react-toastify';

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      orderService.getOrder(id),
      orderService.trackOrder(id).catch(() => null),
    ]).then(([orderRes, trackRes]) => {
      setOrder(orderRes.data?.data);
      setTracking(trackRes?.data?.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const cancelOrder = async () => {
    try {
      await orderService.cancelOrder(id);
      toast.success('Order cancelled');
      const res = await orderService.getOrder(id);
      setOrder(res.data?.data);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not cancel');
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!order) return <div className="container py-5 text-center">Order not found</div>;

  const items = order.items ?? order.order_items ?? [];

  return (
    <>
      <SEO title={`Order #${order.order_number ?? order.id}`} />
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ to: '/orders', label: 'Orders' }, { label: `#${order.order_number ?? order.id}` }]} />
          <div className="d-flex justify-content-between align-items-center">
            <h1>Order #{order.order_number ?? order.id}</h1>
            {order.status === 'pending' && (
              <Button variant="outline" onClick={cancelOrder}>Cancel Order</Button>
            )}
          </div>
        </div>
      </div>

      <div className="container py-5">
        <div className="row g-5">
          <div className="col-lg-8">
            <h5 className="text-uppercase small fw-semibold mb-3">Items</h5>
            {items.map((item) => (
              <div key={item.id} className="d-flex gap-3 border-bottom py-3">
                <img src={getProductImage(item)} alt={item.name ?? item.product_name} style={{ width: 80, aspectRatio: '3/4', objectFit: 'cover' }} />
                <div className="flex-grow-1">
                  <div className="fw-medium">{item.name ?? item.product_name}</div>
                  <div className="small text-muted">Qty: {item.quantity}</div>
                </div>
                <div>{formatPrice(item.total ?? item.price * item.quantity)}</div>
              </div>
            ))}

            {tracking && (
              <div className="mt-5">
                <h5 className="text-uppercase small fw-semibold mb-3">Tracking</h5>
                <div className="border p-4">
                  {tracking.status && <p><strong>Status:</strong> {tracking.status}</p>}
                  {tracking.tracking_number && <p><strong>Tracking #:</strong> {tracking.tracking_number}</p>}
                  {tracking.updates?.map((u, i) => (
                    <div key={i} className="small text-muted">{formatDate(u.date)} — {u.message ?? u.status}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="col-lg-4">
            <div className="border p-4">
              <h5 className="text-uppercase small fw-semibold mb-3">Summary</h5>
              <div className="small mb-2"><strong>Date:</strong> {formatDate(order.created_at)}</div>
              <div className="small mb-2"><strong>Status:</strong> {order.status}</div>
              <div className="small mb-2"><strong>Payment:</strong> {order.payment_method ?? 'N/A'}</div>
              <hr />
              <div className="d-flex justify-content-between fw-semibold">
                <span>Total</span>
                <span>{formatPrice(order.total_amount ?? order.total)}</span>
              </div>
              <Link to="/track-order" className="d-block mt-3 small">Track another order</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
