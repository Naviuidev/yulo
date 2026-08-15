import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Loader from '../../components/common/Loader';
import customerService from '../../services/customerService';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

const CustomerDetail = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await customerService.get(id);
        setData(res);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const toggleStatus = async () => {
    const newStatus = data.customer.status === 'active' ? 'inactive' : 'active';
    try {
      await customerService.updateStatus(id, newStatus);
      toast.success(`Customer ${newStatus}`);
      setData((d) => ({ ...d, customer: { ...d.customer, status: newStatus } }));
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!data?.customer) return <div className="yulo-empty">Customer not found.</div>;

  const { customer, recent_orders } = data;

  const orderColumns = [
    { key: 'order_number', label: 'Order #' },
    { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'created_at', label: 'Date', render: (r) => formatDateTime(r.created_at) },
  ];

  return (
    <>
      <Helmet><title>{customer.name} — YULO Admin</title></Helmet>
      <PageHeader
        title={customer.name}
        subtitle={customer.email}
        breadcrumbs={<Link to="/customers" className="text-muted text-decoration-none">Customers</Link>}
        actions={
          <button type="button" className={`btn btn-sm btn-outline-${customer.status === 'active' ? 'danger' : 'success'}`} onClick={toggleStatus}>
            {customer.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
        }
      />

      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="yulo-card h-100">
            <div className="yulo-card-header"><h5>Profile</h5></div>
            <div className="yulo-card-body">
              <dl className="mb-0 small">
                <dt className="text-muted">Name</dt>
                <dd>{customer.name || '—'}</dd>
                <dt className="text-muted">Email</dt>
                <dd>{customer.email || '—'}</dd>
                <dt className="text-muted">Phone</dt>
                <dd>{customer.phone || '—'}</dd>
                <dt className="text-muted">Status</dt>
                <dd><StatusBadge status={customer.status} /></dd>
                <dt className="text-muted">Joined</dt>
                <dd>{formatDate(customer.created_at)}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="yulo-card h-100">
            <div className="yulo-card-header"><h5><i className="bi bi-wallet2 me-2" />Wallet</h5></div>
            <div className="yulo-card-body">
              <h3 className="text-gold mb-0">{formatCurrency(customer.wallet_balance || 0)}</h3>
              <p className="small text-muted mb-0 mt-1">Available balance</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="yulo-card h-100">
            <div className="yulo-card-header"><h5><i className="bi bi-star me-2" />Rewards</h5></div>
            <div className="yulo-card-body">
              <h3 className="mb-0">{customer.reward_points || 0}</h3>
              <p className="small text-muted mb-0 mt-1">Reward points</p>
            </div>
          </div>
        </div>
      </div>

      <div className="yulo-card">
        <div className="yulo-card-header">
          <h5><i className="bi bi-bag me-2" />Recent Orders</h5>
          <Link to={`/orders?customer=${customer.id}`} className="btn btn-sm btn-outline-gold">View All</Link>
        </div>
        <DataTable columns={orderColumns} data={recent_orders || []} emptyMessage="No orders yet." />
      </div>
    </>
  );
};

export default CustomerDetail;
