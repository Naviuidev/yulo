import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import Loader from '../../components/common/Loader';
import inventoryService from '../../services/inventoryService';
import { formatCurrency, formatDateTime, formatNumber } from '../../utils/formatters';
import { resolveMediaUrl } from '../../utils/media';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
  { value: 'ok', label: 'Healthy' },
];

function stockBadge(status, stock) {
  if (status === 'out' || stock <= 0) {
    return <span className="badge yulo-badge yulo-badge--light">Out · {stock}</span>;
  }
  if (status === 'low') {
    return <span className="badge yulo-badge yulo-badge--light">Low · {stock}</span>;
  }
  return <span className="badge yulo-badge yulo-badge--dark">In stock · {stock}</span>;
}

const Inventory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get('low_stock') === '1'
    ? 'low'
    : (searchParams.get('filter') || 'all');

  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [threshold, setThreshold] = useState(5);

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: { quantity: 1, type: 'restock', notes: '' },
  });
  const adjustType = watch('type');

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = { per_page: 100 };
      if (filter && filter !== 'all') params.filter = filter;
      if (search.trim()) params.q = search.trim();
      const { items: data, summary: sum, low_stock_threshold: thr } = await inventoryService.list(params);
      setItems(data || []);
      setSummary(sum);
      setThreshold(thr ?? 5);
    } catch {
      setItems([]);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const t = setTimeout(fetchInventory, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchInventory, search]);

  const openDetail = async (productId, openAdjust = false) => {
    setSelectedId(productId);
    setDetailLoading(true);
    setAdjustOpen(openAdjust);
    try {
      const data = await inventoryService.get(productId);
      setDetail(data);
      reset({ quantity: 1, type: 'restock', notes: '' });
    } catch {
      toast.error('Failed to load product inventory');
      setDetail(null);
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setAdjustOpen(false);
  };

  const onAdjust = async (data) => {
    if (!detail?.id) return;
    try {
      const result = await inventoryService.adjust({
        product_id: detail.id,
        quantity: Number(data.quantity),
        type: data.type,
        notes: data.notes,
      });
      toast.success(`Stock updated to ${result?.stock ?? '—'}`);
      setAdjustOpen(false);
      reset({ quantity: 1, type: 'restock', notes: '' });
      await openDetail(detail.id, false);
      fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Adjustment failed');
    }
  };

  const selectFilter = (value) => {
    setFilter(value);
    if (value === 'low') setSearchParams({ low_stock: '1' });
    else if (value === 'all') setSearchParams({});
    else setSearchParams({ filter: value });
  };

  const columns = [
    {
      key: 'product',
      label: 'Product',
      render: (r) => (
        <div className="d-flex align-items-center gap-2">
          <div
            className="rounded border bg-light flex-shrink-0 overflow-hidden"
            style={{ width: 40, height: 40 }}
          >
            {r.primary_image ? (
              <img
                src={resolveMediaUrl(r.primary_image)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                <i className="bi bi-image" />
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              className="btn btn-link p-0 text-start text-dark text-decoration-none fw-semibold"
              onClick={() => openDetail(r.id)}
            >
              {r.name}
            </button>
            <div className="small text-muted">
              {r.sku || 'No SKU'}
              {r.category_name ? ` · ${r.category_name}` : ''}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'stock',
      label: 'Available',
      render: (r) => stockBadge(r.stock_status, r.stock),
    },
    {
      key: 'units_sold',
      label: 'Sold (paid)',
      render: (r) => formatNumber(r.units_sold),
    },
    {
      key: 'sold_revenue',
      label: 'Sold revenue',
      render: (r) => formatCurrency(r.sold_revenue),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'last_adjusted_at',
      label: 'Last adjust',
      render: (r) => (r.last_adjusted_at ? formatDateTime(r.last_adjusted_at) : '—'),
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => openDetail(r.id)}>
            View
          </button>
          <button type="button" className="btn btn-sm btn-outline-gold" onClick={() => openDetail(r.id, true)}>
            Adjust
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Helmet><title>Inventory — YULO Admin</title></Helmet>
      <PageHeader
        title="Inventory"
        subtitle={`Live stock per product · low stock ≤ ${threshold}`}
        actions={
          <Link to="/products" className="btn btn-sm btn-outline-dark">
            Manage products
          </Link>
        }
      />

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <StatCard icon="bi-box-seam" label="Products" value={formatNumber(summary?.total_products)} accent="dark" />
        </div>
        <div className="col-md-3">
          <StatCard icon="bi-stack" label="Units on hand" value={formatNumber(summary?.total_units)} accent="gold" />
        </div>
        <div className="col-md-3">
          <StatCard icon="bi-exclamation-triangle" label="Low stock" value={formatNumber(summary?.low_stock)} accent="dark" />
        </div>
        <div className="col-md-3">
          <StatCard icon="bi-x-octagon" label="Out of stock" value={formatNumber(summary?.out_of_stock)} accent="gold" />
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`btn btn-sm ${filter === f.value ? 'btn-dark' : 'btn-outline-dark'}`}
            onClick={() => selectFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
        <div className="ms-auto" style={{ minWidth: 220 }}>
          <input
            type="search"
            className="form-control form-control-sm"
            placeholder="Search name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        emptyMessage="No products match this inventory filter."
        onRowClick={(r) => openDetail(r.id)}
      />

      {selectedId ? (
        <>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content yulo-modal">
                <div className="modal-header border-0">
                  <h5 className="modal-title">Product inventory</h5>
                  <button type="button" className="btn-close" onClick={closeDetail} />
                </div>
                <div className="modal-body">
                  {detailLoading || !detail ? (
                    <Loader />
                  ) : (
                    <>
                      <div className="d-flex gap-3 mb-4">
                        <div
                          className="rounded border bg-light flex-shrink-0 overflow-hidden"
                          style={{ width: 88, height: 88 }}
                        >
                          {detail.primary_image ? (
                            <img
                              src={resolveMediaUrl(detail.primary_image)}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                              <i className="bi bi-image fs-3" />
                            </div>
                          )}
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex flex-wrap gap-2 align-items-start justify-content-between">
                            <div>
                              <h5 className="mb-1">{detail.name}</h5>
                              <div className="small text-muted mb-2">
                                SKU {detail.sku || '—'}
                                {detail.category_name ? ` · ${detail.category_name}` : ''}
                                {detail.brand_name ? ` · ${detail.brand_name}` : ''}
                              </div>
                              <div className="d-flex flex-wrap gap-2 align-items-center">
                                {stockBadge(detail.stock_status, detail.stock)}
                                <StatusBadge status={detail.status} />
                              </div>
                            </div>
                            <Link to={`/products/${detail.id}/edit`} className="btn btn-sm btn-outline-dark">
                              Edit product
                            </Link>
                          </div>
                        </div>
                      </div>

                      <div className="row g-3 mb-4">
                        <div className="col-sm-3">
                          <div className="border rounded p-3 h-100">
                            <div className="small text-muted">Available</div>
                            <div className="fs-4 fw-semibold">{formatNumber(detail.stock)}</div>
                          </div>
                        </div>
                        <div className="col-sm-3">
                          <div className="border rounded p-3 h-100">
                            <div className="small text-muted">Sold (paid)</div>
                            <div className="fs-4 fw-semibold">{formatNumber(detail.units_sold)}</div>
                          </div>
                        </div>
                        <div className="col-sm-3">
                          <div className="border rounded p-3 h-100">
                            <div className="small text-muted">Paid orders</div>
                            <div className="fs-4 fw-semibold">{formatNumber(detail.paid_orders)}</div>
                          </div>
                        </div>
                        <div className="col-sm-3">
                          <div className="border rounded p-3 h-100">
                            <div className="small text-muted">Pending units</div>
                            <div className="fs-4 fw-semibold">{formatNumber(detail.pending_units)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="small text-muted">
                          Sold revenue {formatCurrency(detail.sold_revenue)} · Updated {formatDateTime(detail.updated_at)}
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-gold"
                          onClick={() => setAdjustOpen((v) => !v)}
                        >
                          {adjustOpen ? 'Hide adjust' : 'Adjust stock'}
                        </button>
                      </div>

                      {adjustOpen ? (
                        <form onSubmit={handleSubmit(onAdjust)} className="border rounded p-3 mb-4 bg-light">
                          <div className="row g-2 align-items-end">
                            <div className="col-md-3">
                              <label className="form-label small">Type</label>
                              <select className="form-select form-select-sm" {...register('type')}>
                                <option value="restock">Restock (+)</option>
                                <option value="return">Return (+)</option>
                                <option value="sale">Sale (−)</option>
                                <option value="adjustment">Adjustment (+/−)</option>
                              </select>
                            </div>
                            <div className="col-md-3">
                              <label className="form-label small">
                                Quantity {adjustType === 'adjustment' ? '(use − to reduce)' : ''}
                              </label>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                {...register('quantity', { required: true })}
                              />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label small">Notes</label>
                              <input className="form-control form-control-sm" {...register('notes')} placeholder="Optional" />
                            </div>
                            <div className="col-md-2">
                              <button type="submit" className="btn btn-dark btn-sm w-100">Apply</button>
                            </div>
                          </div>
                          <div className="form-text mt-2">
                            Current stock: <strong>{detail.stock}</strong>. Stock cannot go below zero.
                          </div>
                        </form>
                      ) : null}

                      <h6 className="mb-2">Adjustment history</h6>
                      {detail.logs?.length ? (
                        <div className="table-responsive border rounded">
                          <table className="table yulo-table mb-0">
                            <thead>
                              <tr>
                                <th>When</th>
                                <th>Type</th>
                                <th>Qty</th>
                                <th>Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.logs.map((log) => (
                                <tr key={log.id}>
                                  <td>{formatDateTime(log.created_at)}</td>
                                  <td className="text-capitalize">{log.type}</td>
                                  <td className={log.quantity < 0 ? 'text-danger' : 'text-success'}>
                                    {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                                  </td>
                                  <td className="text-muted">{log.notes || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-muted small border rounded p-3">
                          No manual adjustments yet. Checkout sales still reduce product stock automatically.
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light" onClick={closeDetail}>Close</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      ) : null}
    </>
  );
};

export default Inventory;
