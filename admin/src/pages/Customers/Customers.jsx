import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import customerService from '../../services/customerService';
import { formatCurrency, formatDate } from '../../utils/formatters';

const Customers = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = { page, per_page: 15 };
        if (search) params.search = search;
        const { items, pagination: pag } = await customerService.list(params);
        setCustomers(items);
        setPagination(pag);
      } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [page, search]);

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
    { key: 'order_count', label: 'Orders' },
    { key: 'total_spent', label: 'Total Spent', render: (r) => formatCurrency(r.total_spent) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'created_at', label: 'Joined', render: (r) => formatDate(r.created_at) },
  ];

  return (
    <>
      <Helmet><title>Customers — YULO Admin</title></Helmet>
      <PageHeader title="Customers" subtitle="View and manage your customer base" />

      <div className="mb-3">
        <input
          type="search"
          className="form-control form-control-sm"
          style={{ maxWidth: 320 }}
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <DataTable columns={columns} data={customers} loading={loading} onRowClick={(r) => navigate(`/customers/${r.id}`)} />

      {pagination.total_pages > 1 && (
        <div className="d-flex justify-content-center gap-2 mt-3">
          <button className="btn btn-sm btn-outline-dark" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="align-self-center small">Page {page} of {pagination.total_pages}</span>
          <button className="btn btn-sm btn-outline-dark" disabled={page >= pagination.total_pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </>
  );
};

export default Customers;
