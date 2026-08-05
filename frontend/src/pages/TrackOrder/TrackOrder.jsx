import { useState } from 'react';
import { useForm } from 'react-hook-form';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/ui/Button';
import Loader from '../../components/common/Loader';
import { orderService } from '../../services/orderService';
import { formatDate } from '../../utils/helpers';

export default function TrackOrder() {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await orderService.trackOrder(data.order_id);
      setTracking(res.data?.data);
    } catch {
      setTracking({ status: 'not_found', message: 'Order not found. Please check your order ID and email.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Track Order" />
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ label: 'Track Order' }]} />
          <h1>Track Order</h1>
        </div>
      </div>

      <div className="container py-5" style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit(onSubmit)} className="yulo-form mb-5">
          <div className="mb-3">
            <label className="form-label">Order ID</label>
            <input className="form-control" placeholder="e.g. 12345" {...register('order_id', { required: true })} />
          </div>
          <div className="mb-4">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" {...register('email', { required: true })} />
          </div>
          <Button type="submit" loading={loading}>Track Order</Button>
        </form>

        {loading && <Loader fullScreen />}
        {tracking && (
          <div className="border p-4">
            {tracking.status === 'not_found' ? (
              <p className="text-muted mb-0">{tracking.message}</p>
            ) : (
              <>
                <h5 className="text-uppercase small fw-semibold mb-3">Order Status: {tracking.status}</h5>
                {tracking.tracking_number && <p className="small">Tracking #: {tracking.tracking_number}</p>}
                {tracking.updates?.map((u, i) => (
                  <div key={i} className="d-flex gap-3 py-2 border-bottom">
                    <div className="text-muted small" style={{ minWidth: 100 }}>{formatDate(u.date ?? u.created_at)}</div>
                    <div className="small">{u.message ?? u.status}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
