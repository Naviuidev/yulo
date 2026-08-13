import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/ui/Button';
import Loader from '../../components/common/Loader';
import api from '../../services/api';
import { formatDate } from '../../utils/helpers';
import { formatPrice } from '../../utils/formatPrice';

export default function TrackOrder() {
  const [searchParams] = useSearchParams();
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      order_number: searchParams.get('order') || '',
      email: searchParams.get('email') || '',
    },
  });

  const lookup = async ({ order_number, email }) => {
    setLoading(true);
    setTracking(null);
    try {
      const res = await api.get(`/orders/track/${encodeURIComponent(order_number.trim())}`, {
        params: { email: email.trim() },
      });
      setTracking(res.data?.data ?? null);
    } catch (err) {
      setTracking({
        status: 'not_found',
        message: err.response?.data?.message || 'Order not found. Please check your order number and email.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const order = searchParams.get('order');
    const email = searchParams.get('email');
    if (order && email) {
      reset({ order_number: order, email });
      lookup({ order_number: order, email });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <form onSubmit={handleSubmit(lookup)} className="yulo-form mb-5">
          <div className="mb-3">
            <label className="form-label">Order Number</label>
            <input
              className="form-control"
              placeholder="e.g. YULO-20260813-XXXX"
              {...register('order_number', { required: true })}
            />
          </div>
          <div className="mb-4">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" {...register('email', { required: true })} />
          </div>
          <Button type="submit" loading={loading}>
            Track Order
          </Button>
        </form>

        {loading && <Loader />}
        {tracking && (
          <div className="border p-4">
            {!tracking.order_number ? (
              <p className="text-muted mb-0">{tracking.message || 'Order not found.'}</p>
            ) : (
              <>
                <h5 className="text-uppercase small fw-semibold mb-3">
                  Order Status: {tracking.status}
                </h5>
                <p className="small mb-1">
                  <strong>Order:</strong> #{tracking.order_number}
                </p>
                {tracking.total != null && (
                  <p className="small mb-1">
                    <strong>Total:</strong> {formatPrice(tracking.total)}
                  </p>
                )}
                {tracking.delivery?.tracking_number && (
                  <p className="small mb-1">
                    <strong>Tracking #:</strong> {tracking.delivery.tracking_number}
                  </p>
                )}
                {tracking.delivery?.carrier && (
                  <p className="small mb-1">
                    <strong>Carrier:</strong> {tracking.delivery.carrier}
                  </p>
                )}
                {tracking.delivery?.status && (
                  <p className="small mb-0">
                    <strong>Shipment:</strong> {tracking.delivery.status}
                  </p>
                )}
                {tracking.delivery?.estimated_delivery && (
                  <p className="small text-muted mt-2 mb-0">
                    ETA: {formatDate(tracking.delivery.estimated_delivery)}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
