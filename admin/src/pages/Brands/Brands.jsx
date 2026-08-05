import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import ConfirmModal from '../../components/common/ConfirmModal';
import brandService from '../../services/brandService';
import { slugify } from '../../utils/formatters';

const Brands = () => {
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: { name: '', slug: '', description: '', status: 'active' },
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

  useEffect(() => { fetchBrands(); }, []);
  useEffect(() => { if (!editing && name) setValue('slug', slugify(name)); }, [name, editing, setValue]);

  const onEdit = (brand) => {
    setEditing(brand);
    reset({ name: brand.name, slug: brand.slug, description: brand.description || '', status: brand.status || 'active' });
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
      reset({ name: '', slug: '', description: '', status: 'active' });
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
      <Helmet><title>Brands — YULO Admin</title></Helmet>
      <PageHeader title="Brands" subtitle="Manage product brands" />

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
              {editing && <button type="button" className="btn btn-light btn-sm" onClick={() => { setEditing(null); reset(); }}>Cancel</button>}
            </div>
          </form>
        </div>
        <div className="col-lg-8">
          <DataTable columns={columns} data={brands} loading={loading} />
        </div>
      </div>

      <ConfirmModal show={!!deleteId} title="Delete Brand" message="Delete this brand?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </>
  );
};

export default Brands;
