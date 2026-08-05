import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import couponService from '../../services/couponService';
import { formatCurrency, formatDate } from '../../utils/formatters';

const Coupons = () => {
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      code: '', type: 'percentage', value: '', min_order_amount: 0,
      max_discount: '', max_uses: '', expires_at: '', status: 'active',
    },
  });

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const { items } = await couponService.list({ per_page: 50 });
      setCoupons(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const onEdit = (c) => {
    setEditing(c);
    reset({
      code: c.code, type: c.type, value: c.value,
      min_order_amount: c.min_order_amount || 0,
      max_discount: c.max_discount || '', max_uses: c.max_uses || '',
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '', status: c.status,
    });
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        value: Number(data.value),
        min_order_amount: Number(data.min_order_amount) || 0,
        max_discount: data.max_discount ? Number(data.max_discount) : null,
        max_uses: data.max_uses ? Number(data.max_uses) : null,
        expires_at: data.expires_at || null,
      };
      if (editing) {
        await couponService.update(editing.id, payload);
        toast.success('Coupon updated');
      } else {
        await couponService.create(payload);
        toast.success('Coupon created');
      }
      reset();
      setEditing(null);
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async () => {
    try {
      await couponService.remove(deleteId);
      toast.success('Coupon deleted');
      setDeleteId(null);
      fetchCoupons();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'type', label: 'Type' },
    { key: 'value', label: 'Value', render: (r) => r.type === 'percentage' ? `${r.value}%` : formatCurrency(r.value) },
    { key: 'used_count', label: 'Used' },
    { key: 'expires_at', label: 'Expires', render: (r) => formatDate(r.expires_at) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div className="d-flex gap-1">
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => onEdit(r)}><i className="bi bi-pencil" /></button>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeleteId(r.id)}><i className="bi bi-trash" /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Helmet><title>Coupons — YULO Admin</title></Helmet>
      <PageHeader title="Coupons" subtitle="Create and manage discount codes" />

      <div className="row g-4 mb-4">
        <div className="col-lg-4">
          <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
            <h6 className="mb-3">{editing ? 'Edit Coupon' : 'New Coupon'}</h6>
            <div className="mb-3">
              <label className="form-label">Code *</label>
              <input className={`form-control text-uppercase ${errors.code ? 'is-invalid' : ''}`} {...register('code', { required: true })} />
            </div>
            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label">Type</label>
                <select className="form-select" {...register('type')}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div className="col-6">
                <label className="form-label">Value *</label>
                <input type="number" className="form-control" {...register('value', { required: true })} />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Min Order Amount</label>
              <input type="number" className="form-control" {...register('min_order_amount')} />
            </div>
            <div className="mb-3">
              <label className="form-label">Expires At</label>
              <input type="date" className="form-control" {...register('expires_at')} />
            </div>
            <div className="mb-3">
              <label className="form-label">Status</label>
              <select className="form-select" {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-gold btn-sm">{editing ? 'Update' : 'Create'}</button>
              {editing && <button type="button" className="btn btn-light btn-sm" onClick={() => { setEditing(null); reset(); }}>Cancel</button>}
            </div>
          </form>
        </div>
        <div className="col-lg-8">
          <DataTable columns={columns} data={coupons} loading={loading} />
        </div>
      </div>

      <ConfirmModal show={!!deleteId} title="Delete Coupon" message="Delete this coupon?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </>
  );
};

export default Coupons;
