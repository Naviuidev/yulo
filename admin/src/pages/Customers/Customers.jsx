import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import customerService from '../../services/customerService';
import { formatCurrency, formatDate } from '../../utils/formatters';

const VIEWS = [
  { id: 'customers', label: 'Customers', icon: 'bi-bag-check' },
  { id: 'signup', label: 'Signup Users', icon: 'bi-person-plus' },
];

const Customers = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('customers');
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = { page, per_page: 15, type: view };
        if (search) params.search = search;
        const { items, pagination: pag } = await customerService.list(params);
        if (!cancelled) {
          setCustomers(items);
          setPagination(pag);
        }
      } catch {
        if (!cancelled) {
          setCustomers([]);
          setPagination({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(load, search ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [page, search, view]);

  const customerColumns = [
    { key: 'name', label: 'Name', render: (r) => r.name || '—' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
    { key: 'order_count', label: 'Orders' },
    { key: 'total_spent', label: 'Total Spent', render: (r) => formatCurrency(r.total_spent) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'created_at', label: 'Joined', render: (r) => formatDate(r.created_at) },
  ];

  const signupColumns = [
    { key: 'name', label: 'Name', render: (r) => r.name || '—' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
    { key: 'order_count', label: 'Orders', render: (r) => r.order_count ?? 0 },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'created_at', label: 'Signed up', render: (r) => formatDate(r.created_at) },
  ];

  const columns = view === 'signup' ? signupColumns : customerColumns;

  return (
    <>
      <Helmet>
        <title>{view === 'signup' ? 'Signup Users' : 'Customers'} — YULO Admin</title>
      </Helmet>
      <PageHeader
        title="Customers"
        subtitle={
          view === 'signup'
            ? 'All users who signed up on the storefront'
            : 'Customers who have placed at least one order'
        }
      />

      <div className="yulo-doc-cats mb-4">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`yulo-doc-cat ${view === v.id ? 'is-active' : ''}`}
            onClick={() => {
              setView(v.id);
              setPage(1);
              setSearch('');
            }}
          >
            <i className={`bi ${v.icon}`} />
            <span>{v.label}</span>
          </button>
        ))}
      </div>

      <div className="mb-3">
        <input
          type="search"
          className="form-control form-control-sm"
          style={{ maxWidth: 320 }}
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        columns={columns}
        data={customers}
        loading={loading}
        onRowClick={(r) => navigate(`/customers/${r.id}`)}
      />

      {pagination.total_pages > 1 && (
        <div className="d-flex justify-content-center gap-2 mt-3">
          <button
            type="button"
            className="btn btn-sm btn-outline-dark"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="align-self-center small">
            Page {page} of {pagination.total_pages}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-dark"
            disabled={page >= pagination.total_pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
};

export default Customers;
