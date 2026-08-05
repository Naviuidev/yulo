import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import deliveryService from '../../services/deliveryService';
import { formatDate } from '../../utils/formatters';

const Deliveries = () => {
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      order_id: '', carrier: '', tracking_number: '', status: 'pending',
      estimated_delivery: '', notes: '', otp: '',
    },
  });

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const { items } = await deliveryService.list({ per_page: 50 });
      setDeliveries(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDeliveries(); }, []);

  const onEdit = (d) => {
    setEditing(d);
    setShowForm(true);
    reset({
      order_id: d.order_id, carrier: d.carrier || '', tracking_number: d.tracking_number || '',
      status: d.status, estimated_delivery: d.estimated_delivery?.slice(0, 10) || '',
      notes: d.notes || '', otp: d.otp || '',
    });
  };

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await deliveryService.update(editing.id, data);
        toast.success('Delivery updated');
      } else {
        await deliveryService.create(data);
        toast.success('Delivery assigned');
      }
      reset();
      setEditing(null);
      setShowForm(false);
      fetchDeliveries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const columns = [
    { key: 'order_number', label: 'Order #' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'carrier', label: 'Partner', render: (r) => r.carrier || '—' },
    { key: 'tracking_number', label: 'Tracking', render: (r) => r.tracking_number || '—' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'estimated_delivery', label: 'ETA', render: (r) => formatDate(r.estimated_delivery) },
    {
      key: 'actions', label: '',
      render: (r) => (
        <button type="button" className="btn btn-sm btn-outline-gold" onClick={() => onEdit(r)}>
          <i className="bi bi-pencil" /> Manage
        </button>
      ),
    },
  ];

  return (
    <>
      <Helmet><title>Deliveries — YULO Admin</title></Helmet>
      <PageHeader
        title="Deliveries"
        subtitle="Assign partners, track shipments, manage OTP"
        actions={
          <button type="button" className="btn btn-gold btn-sm" onClick={() => { setShowForm(true); setEditing(null); reset(); }}>
            <i className="bi bi-truck me-1" /> Assign Delivery
          </button>
        }
      />

      <DataTable columns={columns} data={deliveries} loading={loading} emptyMessage="No deliveries yet." />

      {showForm && (
        <>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-lg">
              <form onSubmit={handleSubmit(onSubmit)} className="modal-content yulo-modal">
                <div className="modal-header border-0">
                  <h5 className="modal-title">{editing ? 'Update Delivery' : 'Assign Delivery'}</h5>
                  <button type="button" className="btn-close" onClick={() => { setShowForm(false); setEditing(null); }} />
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    {!editing && (
                      <div className="col-md-4">
                        <label className="form-label">Order ID *</label>
                        <input type="number" className="form-control" {...register('order_id', { required: !editing })} />
                      </div>
                    )}
                    <div className="col-md-4">
                      <label className="form-label">Delivery Partner</label>
                      <input className="form-control" placeholder="Delhivery, BlueDart..." {...register('carrier')} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Tracking Number</label>
                      <input className="form-control" {...register('tracking_number')} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Status</label>
                      <select className="form-select" {...register('status')}>
                        <option value="pending">Pending</option>
                        <option value="picked_up">Picked Up</option>
                        <option value="in_transit">In Transit</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Estimated Delivery</label>
                      <input type="date" className="form-control" {...register('estimated_delivery')} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Delivery OTP</label>
                      <input className="form-control" placeholder="4-digit OTP" {...register('otp')} />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Notes</label>
                      <textarea className="form-control" rows={2} {...register('notes')} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</button>
                  <button type="submit" className="btn btn-gold">{editing ? 'Update' : 'Assign'}</button>
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

export default Deliveries;
