import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import ConfirmModal from '../../components/common/ConfirmModal';
import offerStripService from '../../services/offerStripService';
import offerCardService from '../../services/offerCardService';

const TABS = [
  { id: 'strips', label: 'Strips', icon: 'bi-megaphone' },
  { id: 'offer-card', label: 'Offer Card', icon: 'bi-postcard' },
];

const emptyStripForm = {
  text: '',
  is_scrolling: false,
  sort_order: 0,
  status: 'active',
};

const emptyCardForm = {
  title: '',
  image: '',
  link: '',
  show_popup: true,
  status: 'active',
};

function StripsTab() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: emptyStripForm });
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
      reset(emptyStripForm);
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
      render: (r) => (
        <span className="text-truncate d-inline-block" style={{ maxWidth: 360 }}>
          {r.text}
        </span>
      ),
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
              <div className="form-text">Off = centered static text. On = one-at-a-time horizontal scroll.</div>
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
                    reset(emptyStripForm);
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
}

function OfferCardTab() {
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: emptyCardForm });
  const image = watch('image');
  const showPopup = watch('show_popup');

  const fetchCard = async () => {
    setLoading(true);
    try {
      const data = await offerCardService.get();
      setCard(data || null);
      if (data) {
        reset({
          title: data.title || '',
          image: data.image || '',
          link: data.link || '',
          show_popup: Boolean(data.show_popup),
          status: data.status || 'active',
        });
      } else {
        reset(emptyCardForm);
      }
    } catch {
      toast.error('Failed to load offer card');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCard();
  }, []);

  const onSubmit = async (data) => {
    const payload = {
      title: data.title?.trim() || null,
      image: data.image.trim(),
      link: data.link?.trim() || null,
      show_popup: Boolean(data.show_popup),
      status: data.status,
    };

    if (!payload.image) {
      toast.error('Banner image URL is required');
      return;
    }

    try {
      if (card?.id) {
        await offerCardService.update(card.id, payload);
        toast.success('Offer card updated');
      } else {
        await offerCardService.create(payload);
        toast.success('Offer card created');
      }
      fetchCard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async () => {
    try {
      await offerCardService.remove(card.id);
      toast.success('Offer card deleted');
      setConfirmDelete(false);
      setCard(null);
      reset(emptyCardForm);
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return <div className="text-muted py-4">Loading offer card…</div>;
  }

  return (
    <>
      <div className="alert alert-light border mb-4">
        Only <strong>one</strong> offer banner card is allowed. When “Show popup” is on and status is Active, it
        appears once when a visitor first lands on the homepage (until they close it).
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
            <h6 className="mb-3">{card ? 'Edit Offer Card' : 'Add Offer Card'}</h6>

            <div className="mb-3">
              <label className="form-label">Title (admin only)</label>
              <input className="form-control" placeholder="Welcome offer" {...register('title')} />
            </div>

            <div className="mb-3">
              <label className="form-label">Banner image URL *</label>
              <input
                className="form-control"
                placeholder="https://… or /uploads/…"
                {...register('image', { required: true })}
              />
              <div className="form-text">Portrait or square works best for the popup card.</div>
            </div>

            <div className="mb-3">
              <label className="form-label">Link URL (optional)</label>
              <input className="form-control" placeholder="/shop" {...register('link')} />
              <div className="form-text">Clicking the banner opens this link.</div>
            </div>

            <div className="mb-3">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="offer-card-popup-toggle"
                  {...register('show_popup')}
                />
                <label className="form-check-label" htmlFor="offer-card-popup-toggle">
                  Show popup on first homepage visit
                </label>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Status</label>
              <select className="form-select" {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="d-flex gap-2 flex-wrap">
              <button type="submit" className="btn btn-gold btn-sm">
                {card ? 'Update' : 'Create'}
              </button>
              {card && (
                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setConfirmDelete(true)}>
                  Delete card
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="col-lg-7">
          <div className="yulo-form-card h-100">
            <h6 className="mb-3">
              Popup preview {showPopup ? <span className="badge text-bg-dark ms-1">Popup on</span> : (
                <span className="badge text-bg-secondary ms-1">Popup off</span>
              )}
            </h6>
            {image ? (
              <div className="offer-card-admin-preview">
                <button type="button" className="offer-card-admin-preview__close" aria-label="Close preview">
                  <i className="bi bi-x-lg" />
                </button>
                <img src={image} alt="Offer banner" />
              </div>
            ) : (
              <div className="text-muted border rounded d-flex align-items-center justify-content-center" style={{ minHeight: 280 }}>
                Banner image preview
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        show={confirmDelete}
        title="Delete Offer Card"
        message="Delete this offer banner card?"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

const OfferStrips = () => {
  const [tab, setTab] = useState('strips');

  return (
    <>
      <Helmet>
        <title>Offer Strips — YULO Admin</title>
      </Helmet>
      <PageHeader
        title="Offers"
        subtitle="Top offer strips and the homepage offer banner popup"
      />

      <div className="yulo-doc-cats mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`yulo-doc-cat ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <i className={`bi ${t.icon}`} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'strips' ? <StripsTab /> : <OfferCardTab />}
    </>
  );
};

export default OfferStrips;
