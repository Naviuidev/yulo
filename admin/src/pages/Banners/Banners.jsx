import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import ConfirmModal from '../../components/common/ConfirmModal';
import bannerService from '../../services/bannerService';

const Banners = () => {
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { title: '', subtitle: '', image_url: '', link_url: '', position: 'home', status: 'active', sort_order: 0 },
  });

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const { items } = await bannerService.list({ per_page: 50 });
      setBanners(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBanners(); }, []);

  const onEdit = (b) => {
    setEditing(b);
    reset(b);
  };

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, sort_order: Number(data.sort_order) || 0 };
      if (editing) {
        await bannerService.update(editing.id, payload);
        toast.success('Banner updated');
      } else {
        await bannerService.create(payload);
        toast.success('Banner created');
      }
      reset();
      setEditing(null);
      fetchBanners();
    } catch {
      toast.error('Save failed');
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
    { key: 'title', label: 'Title' },
    { key: 'position', label: 'Position' },
    { key: 'status', label: 'Status' },
    { key: 'sort_order', label: 'Order' },
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
      <Helmet><title>Banners — YULO Admin</title></Helmet>
      <PageHeader title="Banners" subtitle="Manage homepage and promotional banners" />

      <div className="row g-4">
        <div className="col-lg-4">
          <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
            <h6 className="mb-3">{editing ? 'Edit Banner' : 'Add Banner'}</h6>
            <div className="mb-3"><label className="form-label">Title</label><input className="form-control" {...register('title')} /></div>
            <div className="mb-3"><label className="form-label">Subtitle</label><input className="form-control" {...register('subtitle')} /></div>
            <div className="mb-3"><label className="form-label">Image URL</label><input className="form-control" {...register('image_url')} /></div>
            <div className="mb-3"><label className="form-label">Link URL</label><input className="form-control" {...register('link_url')} /></div>
            <div className="mb-3">
              <label className="form-label">Position</label>
              <select className="form-select" {...register('position')}>
                <option value="home">Home</option>
                <option value="category">Category</option>
                <option value="promo">Promo</option>
              </select>
            </div>
            <div className="mb-3"><label className="form-label">Sort Order</label><input type="number" className="form-control" {...register('sort_order')} /></div>
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
        <div className="col-lg-8"><DataTable columns={columns} data={banners} loading={loading} /></div>
      </div>

      <ConfirmModal show={!!deleteId} title="Delete Banner" message="Delete this banner?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </>
  );
};

export default Banners;
