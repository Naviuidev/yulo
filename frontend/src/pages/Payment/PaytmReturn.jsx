import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import SEO from '../../components/common/SEO';
import Button from '../../components/ui/Button';
import Loader from '../../components/common/Loader';
import useCart from '../../hooks/useCart';
import { paymentService } from '../../services/orderService';

export default function PaytmReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshCart } = useCart();
  const orderRef =
    searchParams.get('order_id') || searchParams.get('ORDERID') || searchParams.get('orderId') || '';
  const [status, setStatus] = useState('checking'); // checking | paid | pending | failed
  const [orderId, setOrderId] = useState(null);
  const [message, setMessage] = useState('Confirming your payment…');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!orderRef) {
        setStatus('failed');
        setMessage('Missing order reference from Paytm.');
        return;
      }

      try {
        const res = await paymentService.verifyPaytm(orderRef);
        if (cancelled) return;
        const data = res.data?.data;
        setOrderId(data?.order_id ?? null);

        if (data?.payment_status === 'paid') {
          setStatus('paid');
          setMessage('Payment successful. Your order is confirmed.');
          toast.success('Payment successful');
          try {
            await refreshCart?.();
          } catch {
            // ignore
          }
        } else {
          setStatus('pending');
          setMessage('Payment is still pending or was not completed. You can retry from Orders.');
          toast.info('Payment not completed yet');
        }
      } catch (err) {
        if (cancelled) return;
        setStatus('failed');
        setMessage(err.response?.data?.message || 'Could not verify payment.');
        toast.error(err.response?.data?.message || 'Payment verification failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderRef, refreshCart]);

  if (status === 'checking') {
    return (
      <div className="container py-5">
        <SEO title="Payment" />
        <Loader fullScreen />
      </div>
    );
  }

  return (
    <>
      <SEO title="Payment" />
      <div className="container py-5 text-center" style={{ maxWidth: 520 }}>
        <div className={`display-6 mb-3 ${status === 'paid' ? 'text-success' : 'text-muted'}`}>
          <i
            className={`bi ${
              status === 'paid' ? 'bi-check-circle' : status === 'pending' ? 'bi-hourglass-split' : 'bi-x-circle'
            }`}
          />
        </div>
        <h1 className="h4 mb-2">
          {status === 'paid' ? 'Payment Successful' : status === 'pending' ? 'Payment Pending' : 'Payment Failed'}
        </h1>
        <p className="text-muted mb-4">{message}</p>
        <div className="d-flex justify-content-center gap-2 flex-wrap">
          {orderId ? (
            <Button onClick={() => navigate(`/profile?section=orders&order=${orderId}`)}>View Order</Button>
          ) : (
            <Button onClick={() => navigate('/profile?section=orders')}>My Orders</Button>
          )}
          <Link to="/shop">
            <Button variant="outline">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
