import { Helmet } from 'react-helmet-async';
import PageHeader from '../../components/common/PageHeader';

const MOCK_NOTIFICATIONS = [
  { id: 1, title: 'New Order Received', message: 'Order #YULO-1042 placed by Rahul Sharma', time: '5 min ago', type: 'order', read: false },
  { id: 2, title: 'Low Stock Alert', message: 'Premium Silk Saree is down to 3 units', time: '1 hour ago', type: 'stock', read: false },
  { id: 3, title: 'Payment Confirmed', message: 'Order #YULO-1040 payment received via PhonePe', time: '2 hours ago', type: 'payment', read: true },
  { id: 4, title: 'New Customer', message: 'Priya Patel registered an account', time: '3 hours ago', type: 'customer', read: true },
  { id: 5, title: 'Delivery Completed', message: 'Order #YULO-1038 delivered successfully', time: 'Yesterday', type: 'delivery', read: true },
];

const iconMap = {
  order: 'bi-bag-check',
  stock: 'bi-exclamation-triangle',
  payment: 'bi-credit-card',
  customer: 'bi-person-plus',
  delivery: 'bi-truck',
};

const Notifications = () => (
  <>
    <Helmet><title>Notifications — YULO Admin</title></Helmet>
    <PageHeader title="Notifications" subtitle="Recent activity and alerts" />

    <div className="yulo-card">
      <div className="yulo-card-body p-0">
        {MOCK_NOTIFICATIONS.map((n) => (
          <div key={n.id} className={`yulo-alert-item ${!n.read ? 'bg-light' : ''}`}>
            <div className="yulo-alert-item__icon" style={{ background: 'rgba(0,0,0,0.08)', color: '#111' }}>
              <i className={`bi ${iconMap[n.type] || 'bi-bell'}`} />
            </div>
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between">
                <strong className="small">{n.title}</strong>
                <span className="small text-muted">{n.time}</span>
              </div>
              <p className="mb-0 small text-muted">{n.message}</p>
            </div>
            {!n.read && <span className="badge bg-gold text-dark">New</span>}
          </div>
        ))}
      </div>
    </div>
  </>
);

export default Notifications;
