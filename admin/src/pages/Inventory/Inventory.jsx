import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import inventoryService from '../../services/inventoryService';

const Inventory = () => {
  const [searchParams] = useSearchParams();
  const lowStockOnly = searchParams.get('low_stock') === '1';
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const { register, handleSubmit, reset } = useForm({ defaultValues: { quantity: 0, type: 'adjustment', notes: '' } });

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = { per_page: 50 };
      if (lowStockOnly) params.low_stock = 1;
      const { items: data } = await inventoryService.list(params);
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInventory(); }, [lowStockOnly]);

  const onAdjust = async (data) => {
    try {
      await inventoryService.adjust({
        product_id: adjustProduct.id,
        quantity: Number(data.quantity),
        type: data.type,
        notes: data.notes,
      });
      toast.success('Stock adjusted');
      setAdjustProduct(null);
      reset();
      fetchInventory();
    } catch {
      toast.error('Adjustment failed');
    }
  };

  const columns = [
    { key: 'name', label: 'Product' },
    { key: 'sku', label: 'SKU', render: (r) => r.sku || '—' },
    { key: 'category_name', label: 'Category', render: (r) => r.category_name || '—' },
    { key: 'stock', label: 'Stock', render: (r) => <span className={r.stock <= 5 ? 'badge bg-danger' : 'badge bg-success'}>{r.stock}</span> },
    { key: 'status', label: 'Status' },
    {
      key: 'actions', label: '',
      render: (r) => (
        <button type="button" className="btn btn-sm btn-outline-gold" onClick={() => setAdjustProduct(r)}>
          <i className="bi bi-plus-slash-minus" /> Adjust
        </button>
      ),
    },
  ];

  return (
    <>
      <Helmet><title>Inventory — YULO Admin</title></Helmet>
      <PageHeader
        title="Inventory"
        subtitle={lowStockOnly ? 'Low stock products' : 'Stock levels and adjustments'}
        actions={
          <Link to={lowStockOnly ? '/inventory' : '/inventory?low_stock=1'} className="btn btn-sm btn-outline-dark">
            {lowStockOnly ? 'Show All' : 'Low Stock Only'}
          </Link>
        }
      />

      <DataTable columns={columns} data={items} loading={loading} emptyMessage="No inventory records." />

      {adjustProduct && (
        <>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <form onSubmit={handleSubmit(onAdjust)} className="modal-content yulo-modal">
                <div className="modal-header border-0">
                  <h5 className="modal-title">Adjust Stock — {adjustProduct.name}</h5>
                  <button type="button" className="btn-close" onClick={() => setAdjustProduct(null)} />
                </div>
                <div className="modal-body">
                  <p className="small text-muted">Current stock: <strong>{adjustProduct.stock}</strong></p>
                  <div className="mb-3">
                    <label className="form-label">Quantity (+/-)</label>
                    <input type="number" className="form-control" {...register('quantity', { required: true })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Type</label>
                    <select className="form-select" {...register('type')}>
                      <option value="adjustment">Adjustment</option>
                      <option value="restock">Restock</option>
                      <option value="sale">Sale</option>
                      <option value="return">Return</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <input className="form-control" {...register('notes')} />
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light" onClick={() => setAdjustProduct(null)}>Cancel</button>
                  <button type="submit" className="btn btn-gold">Apply</button>
                </div>
              </form>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}
    </>
  );
};

export default Inventory;
