import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import ConfirmModal from '../../components/common/ConfirmModal';
import bannerService from '../../services/bannerService';

const MAX_HOME_ACTIVE = 3;

const emptyForm = {
  title: '',
  image: '',
  link: '',
  position: 'home',
  status: 'active',
  sort_order: 0,
};

const Banners = () => {
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: emptyForm });

  const watchPosition = watch('position');
  const watchStatus = watch('status');
  const watchImage = watch('image');

  const homeActiveCount = useMemo(
    () => banners.filter((b) => b.position === 'home' && b.status === 'active').length,
    [banners]
  );

  const wouldExceedHomeLimit = useMemo(() => {
    if (watchPosition !== 'home' || watchStatus !== 'active') return false;
    const others = banners.filter(
      (b) => b.position === 'home' && b.status === 'active' && (!editing || b.id !== editing.id)
    );
    return others.length >= MAX_HOME_ACTIVE;
  }, [banners, editing, watchPosition, watchStatus]);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const { items } = await bannerService.list({ per_page: 50 });
      setBanners(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const onEdit = (b) => {
    setEditing(b);
    reset({
      title: b.title || '',
      image: b.image || b.image_url || '',
      link: b.link || b.link_url || '',
      position: b.position || 'home',
      status: b.status || 'active',
      sort_order: b.sort_order ?? 0,
    });
  };

  const onSubmit = async (data) => {
    if (wouldExceedHomeLimit) {
      toast.error(`Maximum ${MAX_HOME_ACTIVE} active Home hero banners allowed`);
      return;
    }

    try {
      const payload = {
        title: data.title || null,
        image: data.image.trim(),
        link: data.link?.trim() || null,
        position: data.position,
        status: data.status,
        sort_order: Number(data.sort_order) || 0,
      };

      if (!payload.image) {
        toast.error('Image URL is required');
        return;
      }

      if (editing) {
        await bannerService.update(editing.id, payload);
        toast.success('Banner updated');
      } else {
        await bannerService.create(payload);
        toast.success('Banner created');
      }
      reset(emptyForm);
      setEditing(null);
      fetchBanners();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async () => {
    try {
      await bannerService.remove(deleteId);
      toast.success('Banner deleted');
      setDeleteId(null);
      fetchBanners();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const columns = [
    {
      key: 'image',
      label: 'Preview',
      render: (r) =>
        r.image ? (
          <img
            src={r.image}
            alt={r.title || 'Banner'}
            style={{ width: 72, height: 40, objectFit: 'cover', borderRadius: 4 }}
          />
        ) : (
          '—'
        ),
    },
    { key: 'title', label: 'Title' },
    { key: 'position', label: 'Position' },
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
        <title>Banners — YULO Admin</title>
      </Helmet>
      <PageHeader
        title="Banners"
        subtitle={`Homepage hero backgrounds (max ${MAX_HOME_ACTIVE} active Home banners). Logo & CTAs stay fixed on the site.`}
      />

      <div className="alert alert-light border mb-4">
        Active Home banners: <strong>{homeActiveCount}</strong> / {MAX_HOME_ACTIVE}. These images slide behind the
        hero logo and “WEAR YULO. LOOK AWESOME.” on the storefront.
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
            <h6 className="mb-3">{editing ? 'Edit Banner' : 'Add Banner'}</h6>
            <div className="mb-3">
              <label className="form-label">Title (admin only)</label>
              <input className="form-control" placeholder="Hero 1" {...register('title')} />
            </div>
            <div className="mb-3">
              <label className="form-label">Image URL *</label>
              <input
                className="form-control"
                placeholder="https://… or /uploads/banners/…"
                {...register('image', { required: true })}
              />
              <div className="form-text">Use a wide landscape image (≈1920×1080).</div>
              {watchImage ? (
                <img
                  src={watchImage}
                  alt="Preview"
                  className="mt-2 rounded border"
                  style={{ width: '100%', maxHeight: 140, objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
            </div>
            <div className="mb-3">
              <label className="form-label">Link URL (optional)</label>
              <input className="form-control" placeholder="/shop" {...register('link')} />
            </div>
            <div className="mb-3">
              <label className="form-label">Position</label>
              <select className="form-select" {...register('position')}>
                <option value="home">Home (hero slider)</option>
                <option value="category">Category</option>
                <option value="promo">Promo</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Sort Order</label>
              <input type="number" className="form-control" {...register('sort_order')} />
              <div className="form-text">Lower number shows first in the hero slider.</div>
            </div>
            <div className="mb-3">
              <label className="form-label">Status</label>
              <select className="form-select" {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            {wouldExceedHomeLimit && (
              <div className="alert alert-warning py-2 small">
                Already {MAX_HOME_ACTIVE} active Home banners. Set one to Inactive, or change Position.
              </div>
            )}
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-gold btn-sm" disabled={wouldExceedHomeLimit}>
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
          <DataTable columns={columns} data={banners} loading={loading} />
        </div>
      </div>

      <ConfirmModal
        show={!!deleteId}
        title="Delete Banner"
        message="Delete this banner?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
};

export default Banners;
