import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import ConfirmModal from '../../components/common/ConfirmModal';
import categoryService from '../../services/categoryService';
import { slugify } from '../../utils/formatters';
import { resolveMediaUrl } from '../../utils/media';

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  image: '',
  sort_order: 0,
  status: 'active',
};

const Categories = () => {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: emptyForm,
  });

  const name = watch('name');
  const image = watch('image');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { items } = await categoryService.list({ per_page: 100 });
      setCategories(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { if (!editing && name) setValue('slug', slugify(name)); }, [name, editing, setValue]);

  const onEdit = (cat) => {
    setEditing(cat);
    reset({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image: cat.image || '',
      sort_order: cat.sort_order ?? 0,
      status: cat.status || 'active',
    });
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        sort_order: Number(data.sort_order) || 0,
        image: data.image?.trim() || null,
      };
      if (editing) {
        await categoryService.update(editing.id, payload);
        toast.success('Category updated');
      } else {
        await categoryService.create(payload);
        toast.success('Category created');
      }
      reset(emptyForm);
      setEditing(null);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await categoryService.uploadIcon(file);
      const path = result?.url || result?.path || '';
      if (path) {
        setValue('image', path, { shouldDirty: true });
        toast.success('Icon uploaded');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async () => {
    try {
      await categoryService.remove(deleteId);
      toast.success('Category deleted');
      setDeleteId(null);
      fetchCategories();
    } catch (err) {
      const data = err.response?.data;
      const products = data?.data?.products || data?.errors?.products || [];
      const names = products.map((p) => p.name).filter(Boolean);
      const message = data?.message
        || 'Cannot delete this category. Delete associated products first.';
      toast.error(
        names.length
          ? `${message} Products: ${names.join(', ')}${products.length >= 10 ? '…' : ''}`
          : message
      );
      setDeleteId(null);
    }
  };

  const columns = [
    {
      key: 'image',
      label: 'Icon',
      render: (r) => (
        r.image ? (
          <img
            src={resolveMediaUrl(r.image)}
            alt={r.name}
            style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '50%', border: '1px solid #e5e5e5' }}
          />
        ) : (
          <span className="text-muted small">—</span>
        )
      ),
    },
    { key: 'name', label: 'Name' },
    { key: 'slug', label: 'Slug' },
    { key: 'sort_order', label: 'Order' },
    { key: 'status', label: 'Status' },
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
      <Helmet><title>Categories — YULO Admin</title></Helmet>
      <PageHeader title="Categories" subtitle="Organize products into categories — icons appear on the storefront slider" />

      <div className="row g-4">
        <div className="col-lg-4">
          <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
            <h6 className="mb-3">{editing ? 'Edit Category' : 'Add Category'}</h6>
            <div className="mb-3">
              <label className="form-label">Name *</label>
              <input className={`form-control ${errors.name ? 'is-invalid' : ''}`} {...register('name', { required: true })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Slug *</label>
              <input className={`form-control ${errors.slug ? 'is-invalid' : ''}`} {...register('slug', { required: true })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Icon / Image</label>
              <input
                className="form-control mb-2"
                placeholder="https://… or /uploads/categories/…"
                {...register('image')}
              />
              <input
                type="file"
                className="form-control form-control-sm"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleIconUpload}
                disabled={uploading}
              />
              <div className="form-text">{uploading ? 'Uploading…' : 'Upload an icon or paste an image URL'}</div>
              {image ? (
                <div className="mt-2 d-flex align-items-center gap-2">
                  <img
                    src={resolveMediaUrl(image)}
                    alt="Preview"
                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '50%', border: '1px solid #e5e5e5' }}
                  />
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-danger p-0"
                    onClick={() => setValue('image', '')}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
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
                  onClick={() => { setEditing(null); reset(emptyForm); }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        <div className="col-lg-8">
          <DataTable columns={columns} data={categories} loading={loading} />
        </div>
      </div>

      <ConfirmModal show={!!deleteId} title="Delete Category" message="Delete this category?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </>
  );
};

export default Categories;
