import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import ConfirmModal from '../../components/common/ConfirmModal';
import brandService from '../../services/brandService';
import homeSectionService from '../../services/homeSectionService';
import { slugify } from '../../utils/formatters';

const TABS = [
  { id: 'brands', label: 'Brands', icon: 'bi-award' },
  { id: 'sections', label: 'Sections UI', icon: 'bi-layout-text-window-reverse' },
  { id: 'sales', label: 'Configure Sales', icon: 'bi-lightning-charge' },
];

const FLASH_SLUG = 'flash-sale';

const emptyBrand = { name: '', slug: '', description: '', status: 'active' };
const emptySection = {
  name: '',
  slug: '',
  description: '',
  sort_order: 0,
  status: 'active',
};
const emptySales = {
  sale_start_date: '',
  sale_end_date: '',
  sale_start_time: '',
  sale_end_time: '',
};

function BrandsTab() {
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: emptyBrand,
  });

  const name = watch('name');

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const { items } = await brandService.list({ per_page: 100 });
      setBrands(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (!editing && name) setValue('slug', slugify(name));
  }, [name, editing, setValue]);

  const onEdit = (brand) => {
    setEditing(brand);
    reset({
      name: brand.name,
      slug: brand.slug,
      description: brand.description || '',
      status: brand.status || 'active',
    });
  };

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await brandService.update(editing.id, data);
        toast.success('Brand updated');
      } else {
        await brandService.create(data);
        toast.success('Brand created');
      }
      reset(emptyBrand);
      setEditing(null);
      fetchBrands();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async () => {
    try {
      await brandService.remove(deleteId);
      toast.success('Brand deleted');
      setDeleteId(null);
      fetchBrands();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const columns = [
    { key: 'name', label: 'Brand' },
    { key: 'slug', label: 'Slug' },
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
      <div className="row g-4">
        <div className="col-lg-4">
          <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
            <h6 className="mb-3">{editing ? 'Edit Brand' : 'Add Brand'}</h6>
            <div className="mb-3">
              <label className="form-label">Name *</label>
              <input className={`form-control ${errors.name ? 'is-invalid' : ''}`} {...register('name', { required: true })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Slug *</label>
              <input className={`form-control ${errors.slug ? 'is-invalid' : ''}`} {...register('slug', { required: true })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={2} {...register('description')} />
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
              {editing && (
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => {
                    setEditing(null);
                    reset(emptyBrand);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        <div className="col-lg-8">
          <DataTable columns={columns} data={brands} loading={loading} />
        </div>
      </div>

      <ConfirmModal
        show={!!deleteId}
        title="Delete Brand"
        message="Delete this brand?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}

function SectionsTab() {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: emptySection,
  });

  const name = watch('name');

  const fetchSections = async () => {
    setLoading(true);
    try {
      const { items } = await homeSectionService.list();
      setSections(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  useEffect(() => {
    if (!editing && name) setValue('slug', slugify(name));
  }, [name, editing, setValue]);

  const isFlashLocked = (row) => Boolean(row?.is_locked) || row?.slug === FLASH_SLUG;

  const onEdit = (row) => {
    setEditing(row);
    reset({
      name: row.name || '',
      slug: row.slug || '',
      description: row.description || '',
      sort_order: row.sort_order ?? 0,
      status: row.status || 'active',
    });
  };

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      sort_order: Number(data.sort_order) || 0,
    };
    if (editing && isFlashLocked(editing)) {
      payload.slug = FLASH_SLUG;
    }
    try {
      if (editing) {
        await homeSectionService.update(editing.id, payload);
        toast.success('Section updated');
      } else {
        await homeSectionService.create(payload);
        toast.success('Section created');
      }
      reset(emptySection);
      setEditing(null);
      fetchSections();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async () => {
    try {
      await homeSectionService.remove(deleteId);
      toast.success('Section deleted');
      setDeleteId(null);
      fetchSections();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const columns = [
    { key: 'name', label: 'Section name' },
    { key: 'slug', label: 'Slug' },
    {
      key: 'product_count',
      label: 'Products',
      render: (r) => r.product_count ?? 0,
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
          {isFlashLocked(r) ? (
            <span className="badge text-bg-secondary align-self-center" title="Protected section">
              Locked
            </span>
          ) : (
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeleteId(r.id)}>
              <i className="bi bi-trash" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const editingFlash = editing && isFlashLocked(editing);

  return (
    <>
      <div className="alert alert-light border mb-4">
        Creating a section alone does not show it on the website. The storefront only renders a section when it has
        products (<strong>Products</strong> column &gt; 0). Assign them under{' '}
        <strong>Products → Add/Edit → Homepage section(s)</strong>. <strong>Flash Sale</strong> also needs a schedule
        under <strong>Configure Sales</strong> (it is locked and cannot be deleted).
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
            <h6 className="mb-3">{editing ? 'Edit Section' : 'Add Section'}</h6>
            <div className="mb-3">
              <label className="form-label">Section name *</label>
              <input
                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                placeholder="New Arrivals"
                {...register('name', { required: true })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Slug *</label>
              <input
                className={`form-control ${errors.slug ? 'is-invalid' : ''}`}
                placeholder="new-arrivals"
                disabled={editingFlash}
                {...register('slug', { required: true })}
              />
              <div className="form-text">
                {editingFlash ? 'Flash Sale slug is fixed and cannot change.' : 'Used in API & View All URL.'}
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={2} {...register('description')} />
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
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-gold btn-sm">{editing ? 'Update' : 'Create'}</button>
              {editing && (
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => {
                    setEditing(null);
                    reset(emptySection);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        <div className="col-lg-8">
          <DataTable columns={columns} data={sections} loading={loading} />
        </div>
      </div>

      <ConfirmModal
        show={!!deleteId}
        title="Delete Section"
        message="Delete this section? Product links to it will be removed."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}

function ConfigureSalesTab() {
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);
  const [editing, setEditing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: emptySales,
  });

  const hasSchedule = Boolean(
    flash?.sale_start_date && flash?.sale_end_date && flash?.sale_start_time && flash?.sale_end_time
  );

  const load = async () => {
    setLoading(true);
    try {
      const { items } = await homeSectionService.list();
      const row = (items || []).find((s) => s.slug === FLASH_SLUG) || null;
      setFlash(row);
      if (row) {
        reset({
          sale_start_date: row.sale_start_date || '',
          sale_end_date: row.sale_end_date || '',
          sale_start_time: row.sale_start_time || '',
          sale_end_time: row.sale_end_time || '',
        });
      }
    } catch {
      toast.error('Failed to load Flash Sale config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (data) => {
    try {
      await homeSectionService.updateSalesConfig({
        sale_start_date: data.sale_start_date,
        sale_end_date: data.sale_end_date,
        sale_start_time: data.sale_start_time,
        sale_end_time: data.sale_end_time,
      });
      toast.success(hasSchedule ? 'Flash Sale schedule updated' : 'Flash Sale schedule saved');
      setEditing(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleClear = async () => {
    try {
      await homeSectionService.clearSalesConfig();
      toast.success('Flash Sale schedule deleted');
      setConfirmClear(false);
      setEditing(false);
      reset(emptySales);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete schedule');
    }
  };

  const startEdit = () => {
    if (flash) {
      reset({
        sale_start_date: flash.sale_start_date || '',
        sale_end_date: flash.sale_end_date || '',
        sale_start_time: flash.sale_start_time || '',
        sale_end_time: flash.sale_end_time || '',
      });
    }
    setEditing(true);
  };

  if (loading) {
    return <div className="text-muted py-4">Loading sales config…</div>;
  }

  if (!flash) {
    return (
      <div className="alert alert-warning">
        Flash Sale section not found. Re-import <code>home_sections.sql</code> to restore it.
      </div>
    );
  }

  return (
    <>
      <div className="alert alert-light border mb-4">
        Manage the Flash Sale schedule used for the homepage countdown. Delete clears dates/times only — the Flash Sale
        section itself stays locked.
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="yulo-form-card h-100">
            <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
              <h6 className="mb-0">Current schedule</h6>
              <div className="d-flex gap-1">
                <button type="button" className="btn btn-sm btn-outline-dark" onClick={startEdit}>
                  <i className="bi bi-pencil me-1" />
                  {hasSchedule ? 'Edit' : 'Add'}
                </button>
                {hasSchedule && (
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setConfirmClear(true)}>
                    <i className="bi bi-trash me-1" />
                    Delete
                  </button>
                )}
              </div>
            </div>

            <dl className="row mb-0 small">
              <dt className="col-5 text-muted">Section</dt>
              <dd className="col-7">{flash.name}</dd>
              <dt className="col-5 text-muted">Start</dt>
              <dd className="col-7">
                {hasSchedule ? `${flash.sale_start_date} ${flash.sale_start_time}` : 'Not set'}
              </dd>
              <dt className="col-5 text-muted">End</dt>
              <dd className="col-7">
                {hasSchedule ? `${flash.sale_end_date} ${flash.sale_end_time}` : 'Not set'}
              </dd>
            </dl>
            <p className="form-text mt-3 mb-0">
              Homepage countdown uses the <strong>end</strong> date &amp; time.
            </p>
          </div>
        </div>

        {editing && (
          <div className="col-lg-6">
            <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
              <h6 className="mb-3">{hasSchedule ? 'Edit schedule' : 'Add schedule'}</h6>

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Sales start date *</label>
                  <input
                    type="date"
                    className={`form-control ${errors.sale_start_date ? 'is-invalid' : ''}`}
                    {...register('sale_start_date', { required: true })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Sales start time *</label>
                  <input
                    type="time"
                    className={`form-control ${errors.sale_start_time ? 'is-invalid' : ''}`}
                    {...register('sale_start_time', { required: true })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Sales end date *</label>
                  <input
                    type="date"
                    className={`form-control ${errors.sale_end_date ? 'is-invalid' : ''}`}
                    {...register('sale_end_date', { required: true })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Sales end time *</label>
                  <input
                    type="time"
                    className={`form-control ${errors.sale_end_time ? 'is-invalid' : ''}`}
                    {...register('sale_end_time', { required: true })}
                  />
                </div>
              </div>

              <div className="d-flex gap-2 mt-4">
                <button type="submit" className="btn btn-gold btn-sm">
                  {hasSchedule ? 'Update schedule' : 'Save schedule'}
                </button>
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => {
                    setEditing(false);
                    reset({
                      sale_start_date: flash.sale_start_date || '',
                      sale_end_date: flash.sale_end_date || '',
                      sale_start_time: flash.sale_start_time || '',
                      sale_end_time: flash.sale_end_time || '',
                    });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <ConfirmModal
        show={confirmClear}
        title="Delete Flash Sale schedule"
        message="Clear start/end date and time? The Flash Sale section will remain; only the schedule is removed."
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  );
}

const Brands = () => {
  const [tab, setTab] = useState('brands');

  return (
    <>
      <Helmet>
        <title>Brands — YULO Admin</title>
      </Helmet>
      <PageHeader title="Brands & Sections" subtitle="Product brands, homepage sections, and Flash Sale schedule" />

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

      {tab === 'brands' && <BrandsTab />}
      {tab === 'sections' && <SectionsTab />}
      {tab === 'sales' && <ConfigureSalesTab />}
    </>
  );
};

export default Brands;
