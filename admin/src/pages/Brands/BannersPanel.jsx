import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import DataTable from '../../components/common/DataTable';
import ConfirmModal from '../../components/common/ConfirmModal';
import ImageUrlUploadField from '../../components/common/ImageUrlUploadField';
import bannerService from '../../services/bannerService';
import featuredCollectionService from '../../services/featuredCollectionService';
import { resolveMediaUrl } from '../../utils/media';

const INNER_TABS = [
  { id: 'banners', label: 'Hero Banners', icon: 'bi-images' },
  { id: 'featured', label: 'Featured Collection', icon: 'bi-grid-1x2' },
];

const MAX_HOME_ACTIVE = 3;
const MAX_FEATURED = 3;

const emptyBannerForm = {
  title: '',
  image: '',
  link: '',
  position: 'home',
  status: 'active',
  sort_order: 0,
};

const emptyFeaturedForm = {
  title: '',
  image: '',
  link: '/shop',
  cta_text: 'Shop Now →',
  sort_order: 0,
  status: 'active',
};

function HeroBannersTab() {
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset, watch, setValue } = useForm({ defaultValues: emptyBannerForm });

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
      reset(emptyBannerForm);
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
            src={resolveMediaUrl(r.image)}
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
              <ImageUrlUploadField
                label="Image URL"
                name="image"
                register={register}
                setValue={setValue}
                value={watchImage}
                required
                helpText="Use a wide landscape image (≈1920×1080)."
                preview="image"
                uploadFn={bannerService.uploadImage}
              />
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
                    reset(emptyBannerForm);
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
}

function FeaturedLayoutPreview({ items }) {
  const active = [...items]
    .filter((i) => i.status === 'active')
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id)
    .slice(0, 3);

  const main = active[0];
  const side = active.slice(1);

  if (!active.length) {
    return (
      <div className="text-muted border rounded d-flex align-items-center justify-content-center" style={{ minHeight: 220 }}>
        Add up to 3 images to preview the Featured Collection layout
      </div>
    );
  }

  return (
    <div className="featured-admin-preview">
      <div className="featured-admin-preview__main">
        {main?.image ? <img src={resolveMediaUrl(main.image)} alt={main.title} /> : null}
        <div className="featured-admin-preview__label">
          <strong>{main?.title || 'Title'}</strong>
          {main?.cta_text ? <span>{main.cta_text}</span> : null}
        </div>
      </div>
      <div className="featured-admin-preview__side">
        {[0, 1].map((idx) => {
          const item = side[idx];
          return (
            <div key={idx} className="featured-admin-preview__item">
              {item?.image ? <img src={resolveMediaUrl(item.image)} alt={item.title || ''} /> : (
                <div className="featured-admin-preview__empty">Side {idx + 1}</div>
              )}
              {item ? (
                <div className="featured-admin-preview__label">
                  <strong>{item.title}</strong>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FeaturedCollectionTab() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset, watch, setValue } = useForm({ defaultValues: emptyFeaturedForm });
  const watchImage = watch('image');
  const watchTitle = watch('title');
  const watchStatus = watch('status');

  const activeCount = useMemo(
    () => items.filter((i) => i.status === 'active').length,
    [items]
  );

  const wouldExceed = useMemo(() => {
    if (watchStatus !== 'active') return false;
    const others = items.filter((i) => i.status === 'active' && (!editing || i.id !== editing.id));
    return others.length >= MAX_FEATURED;
  }, [items, editing, watchStatus]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { items: rows } = await featuredCollectionService.list();
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
      title: row.title || '',
      image: row.image || '',
      link: row.link || '/shop',
      cta_text: row.cta_text || '',
      sort_order: row.sort_order ?? 0,
      status: row.status || 'active',
    });
  };

  const onSubmit = async (data) => {
    if (wouldExceed) {
      toast.error(`Maximum ${MAX_FEATURED} active Featured Collection images allowed`);
      return;
    }

    const payload = {
      title: data.title.trim(),
      image: data.image.trim(),
      link: data.link?.trim() || '/shop',
      cta_text: data.cta_text?.trim() || null,
      sort_order: Number(data.sort_order) || 0,
      status: data.status,
    };

    if (!payload.title || !payload.image) {
      toast.error('Title and image are required');
      return;
    }

    try {
      if (editing) {
        await featuredCollectionService.update(editing.id, payload);
        toast.success('Featured item updated');
      } else {
        await featuredCollectionService.create(payload);
        toast.success('Featured item created');
      }
      reset(emptyFeaturedForm);
      setEditing(null);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async () => {
    try {
      await featuredCollectionService.remove(deleteId);
      toast.success('Featured item deleted');
      setDeleteId(null);
      fetchItems();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const columns = [
    {
      key: 'image',
      label: 'Image',
      render: (r) =>
        r.image ? (
          <img src={resolveMediaUrl(r.image)} alt={r.title} style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          '—'
        ),
    },
    { key: 'title', label: 'Text on image' },
    {
      key: 'layout',
      label: 'Layout',
      render: (r) => {
        const active = items
          .filter((i) => i.status === 'active')
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);
        const idx = active.findIndex((i) => i.id === r.id);
        if (r.status !== 'active' || idx < 0) return '—';
        return idx === 0 ? 'Large (main)' : `Side ${idx}`;
      },
    },
    { key: 'sort_order', label: 'Order' },
    { key: 'status', label: 'Status' },
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
        Add up to <strong>{MAX_FEATURED}</strong> images. Lowest sort order = large left tile; next two = side stack.
        Title text overlays the image (same as the storefront Featured Collection).
        Active: <strong>{activeCount}</strong> / {MAX_FEATURED}.
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
            <h6 className="mb-3">{editing ? 'Edit Featured Image' : 'Add Featured Image'}</h6>

            <div className="mb-3">
              <label className="form-label">Text on image *</label>
              <input
                className="form-control"
                placeholder="Signature Sunglasses"
                {...register('title', { required: true })}
              />
            </div>

            <div className="mb-3">
              <ImageUrlUploadField
                label="Image URL"
                name="image"
                register={register}
                setValue={setValue}
                value={watchImage}
                required
                preview="image"
                overlayLabel={watchTitle}
                uploadFn={featuredCollectionService.uploadImage}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Link URL</label>
              <input className="form-control" placeholder="/shop" {...register('link')} />
            </div>

            <div className="mb-3">
              <label className="form-label">CTA text (main tile)</label>
              <input className="form-control" placeholder="Shop Now →" {...register('cta_text')} />
              <div className="form-text">Shown under the title on the large tile.</div>
            </div>

            <div className="mb-3">
              <label className="form-label">Sort Order</label>
              <input type="number" className="form-control" {...register('sort_order')} />
              <div className="form-text">0 = large main image, 1 &amp; 2 = side images.</div>
            </div>

            <div className="mb-3">
              <label className="form-label">Status</label>
              <select className="form-select" {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {wouldExceed && (
              <div className="alert alert-warning py-2 small">
                Already {MAX_FEATURED} active items. Set one to Inactive before adding another.
              </div>
            )}

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-gold btn-sm" disabled={wouldExceed}>
                {editing ? 'Update' : 'Create'}
              </button>
              {editing && (
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => {
                    setEditing(null);
                    reset(emptyFeaturedForm);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="col-lg-8">
          <div className="yulo-form-card mb-4">
            <h6 className="mb-3">Storefront layout preview</h6>
            <FeaturedLayoutPreview items={items} />
          </div>
          <DataTable columns={columns} data={items} loading={loading} />
        </div>
      </div>

      <ConfirmModal
        show={!!deleteId}
        title="Delete Featured Item"
        message="Delete this featured collection image?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}

/** Banner + Featured Collection panel for Brands page. */
export default function BannersPanel({ initialInnerTab = 'banners' } = {}) {
  const [innerTab, setInnerTab] = useState(
    INNER_TABS.some((t) => t.id === initialInnerTab) ? initialInnerTab : 'banners'
  );

  return (
    <>
      <div className="yulo-doc-cats mb-4">
        {INNER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`yulo-doc-cat ${innerTab === t.id ? 'is-active' : ''}`}
            onClick={() => setInnerTab(t.id)}
          >
            <i className={`bi ${t.icon}`} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {innerTab === 'banners' ? <HeroBannersTab /> : <FeaturedCollectionTab />}
    </>
  );
}
