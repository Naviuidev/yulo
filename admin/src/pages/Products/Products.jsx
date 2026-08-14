import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import productService from '../../services/productService';
import { formatCurrency } from '../../utils/formatters';

const Products = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 15 };
      if (search) params.search = search;
      const { items, pagination: pag } = await productService.list(params);
      setProducts(items);
      setPagination(pag);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchProducts, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [page, search]);

  const handleDelete = async () => {
    try {
      await productService.remove(deleteId);
      toast.success('Product deleted');
      setDeleteId(null);
      fetchProducts();
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const columns = [
    { key: 'name', label: 'Product' },
    { key: 'sku', label: 'SKU', render: (r) => r.sku || '—' },
    { key: 'category_name', label: 'Category', render: (r) => r.category_name || '—' },
    { key: 'price', label: 'Price', render: (r) => formatCurrency(r.price) },
    { key: 'stock', label: 'Stock', render: (r) => <span className={r.stock <= 5 ? 'text-danger fw-medium' : ''}>{r.stock}</span> },
    {
      key: 'rating_percent',
      label: 'Rating %',
      render: (r) => {
        const pct = Number(r.rating_percent ?? 0);
        const avg = Number(r.average_rating ?? 0);
        if (!Number(r.review_count)) return '—';
        return (
          <span title={`${avg.toFixed(1)} / 5`}>
            {pct}%
          </span>
        );
      },
    },
    {
      key: 'review_count',
      label: 'Reviews',
      render: (r) => Number(r.review_count ?? 0),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Link to={`/products/${r.id}/edit`} className="btn btn-sm btn-outline-dark"><i className="bi bi-pencil" /></Link>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeleteId(r.id)}><i className="bi bi-trash" /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Helmet><title>Products — YULO Admin</title></Helmet>
      <PageHeader
        title="Products"
        subtitle="Manage your product catalog"
        actions={<Link to="/products/new" className="btn btn-gold btn-sm"><i className="bi bi-plus-lg me-1" />Add Product</Link>}
      />

      <div className="mb-3">
        <input type="search" className="form-control form-control-sm" style={{ maxWidth: 320 }} placeholder="Search products..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <DataTable columns={columns} data={products} loading={loading} onRowClick={(r) => navigate(`/products/${r.id}/edit`)} />

      {pagination.total_pages > 1 && (
        <div className="d-flex justify-content-center gap-2 mt-3">
          <button className="btn btn-sm btn-outline-dark" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="align-self-center small">Page {page} of {pagination.total_pages}</span>
          <button className="btn btn-sm btn-outline-dark" disabled={page >= pagination.total_pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}

      <ConfirmModal show={!!deleteId} title="Delete Product" message="Are you sure you want to delete this product?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </>
  );
};

export default Products;
