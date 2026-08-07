import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import ConfirmModal from '../../components/common/ConfirmModal';
import offerStripService from '../../services/offerStripService';

const emptyForm = {
  text: '',
  is_scrolling: false,
  sort_order: 0,
  status: 'active',
};

const OfferStrips = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: emptyForm });
  const isScrolling = watch('is_scrolling');
  const previewText = watch('text');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { items: rows } = await offerStripService.list();
      setItems(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const onEdit = (row) => {
    setEditing(row);
    reset({
      text: row.text || '',
      is_scrolling: Boolean(row.is_scrolling),
      sort_order: row.sort_order ?? 0,
      status: row.status || 'active',
    });
  };

  const onSubmit = async (data) => {
    const payload = {
      text: data.text.trim(),
      is_scrolling: Boolean(data.is_scrolling),
      sort_order: Number(data.sort_order) || 0,
      status: data.status,
    };

    if (!payload.text) {
      toast.error('Offer text is required');
      return;
    }

    try {
      if (editing) {
        await offerStripService.update(editing.id, payload);
        toast.success('Offer strip updated');
      } else {
        await offerStripService.create(payload);
        toast.success('Offer strip created');
      }
      reset(emptyForm);
      setEditing(null);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async () => {
    try {
      await offerStripService.remove(deleteId);
      toast.success('Offer strip deleted');
      setDeleteId(null);
      fetchItems();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const columns = [
    {
      key: 'text',
      label: 'Text',
      render: (r) => <span className="text-truncate d-inline-block" style={{ maxWidth: 360 }}>{r.text}</span>,
    },
    {
      key: 'is_scrolling',
      label: 'Motion',
      render: (r) => (r.is_scrolling ? 'Scroll' : 'Center'),
    },
    { key: 'status', label: 'Status' },
    { key: 'sort_order', label: 'Order' },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="d-flex gap-1">
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => onEdit(r)}>
            <i className="bi bi-pencil" />
          </button>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeleteId(r.id)}>
            <i className="bi bi-trash" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Offer Strips — YULO Admin</title>
      </Helmet>
      <PageHeader
        title="Offer Strips"
        subtitle="Top bar above the storefront navbar. Toggle scroll (infinite) or centered static text."
      />

      <div className="alert alert-light border mb-4">
        Active strips appear on the website above the navbar. Lowest sort order is preferred when multiple are active.
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
            <h6 className="mb-3">{editing ? 'Edit Offer Strip' : 'Add Offer Strip'}</h6>

            <div className="mb-3">
              <label className="form-label">Offer text *</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Free shipping on orders above ₹999"
                {...register('text', { required: true })}
              />
            </div>

            <div className="mb-3">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="offer-scroll-toggle"
                  {...register('is_scrolling')}
                />
                <label className="form-check-label" htmlFor="offer-scroll-toggle">
                  Scroll horizontally (infinite)
                </label>
              </div>
              <div className="form-text">
                Off = centered static text. On = continuous horizontal marquee.
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Sort Order</label>
              <input type="number" className="form-control" {...register('sort_order')} />
            </div>

            <div className="mb-3">
              <label className="form-label">Status</label>
              <select className="form-select" {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="mb-3 p-2 border rounded bg-dark text-white small">
              <div className="text-uppercase mb-1 opacity-75" style={{ letterSpacing: '0.12em', fontSize: 10 }}>
                Preview ({isScrolling ? 'Scroll' : 'Center'})
              </div>
              <div className={isScrolling ? 'text-start text-truncate' : 'text-center'}>
                {previewText?.trim() || 'Your offer text will show here'}
              </div>
            </div>

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-gold btn-sm">
                {editing ? 'Update' : 'Create'}
              </button>
              {editing && (
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => {
                    setEditing(null);
                    reset(emptyForm);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="col-lg-8">
          <DataTable columns={columns} data={items} loading={loading} />
        </div>
      </div>

      <ConfirmModal
        show={!!deleteId}
        title="Delete Offer Strip"
        message="Delete this offer strip?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
};

export default OfferStrips;
