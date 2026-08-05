import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import orderService from '../../services/orderService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';

const Orders = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 15 };
      if (status) params.status = status;
      const { items, pagination: pag } = await orderService.list(params);
      setOrders(items);
      setPagination(pag);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [page, status]);

  const columns = [
    { key: 'order_number', label: 'Order #' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'customer_email', label: 'Email' },
    { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'payment_status', label: 'Payment', render: (r) => <StatusBadge status={r.payment_status} /> },
    { key: 'created_at', label: 'Date', render: (r) => formatDateTime(r.created_at) },
  ];

  return (
    <>
      <Helmet><title>Orders — YULO Admin</title></Helmet>
      <PageHeader title="Orders" subtitle="Manage and track customer orders" />

      <div className="mb-3">
        <select className="form-select form-select-sm" style={{ width: 200 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        onRowClick={(row) => navigate(`/orders/${row.id}`)}
        emptyMessage="No orders found."
      />

      {pagination.total_pages > 1 && (
        <div className="d-flex justify-content-center gap-2 mt-3">
          <button className="btn btn-sm btn-outline-dark" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="align-self-center small text-muted">Page {page} of {pagination.total_pages}</span>
          <button className="btn btn-sm btn-outline-dark" disabled={page >= pagination.total_pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </>
  );
};

export default Orders;
