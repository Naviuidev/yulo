import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import ConfirmModal from '../../components/common/ConfirmModal';
import blogService from '../../services/blogService';
import { slugify, formatDate } from '../../utils/formatters';

const Blogs = () => {
  const [loading, setLoading] = useState(true);
  const [blogs, setBlogs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: { title: '', slug: '', excerpt: '', content: '', status: 'draft', featured_image: '' },
  });

  const title = watch('title');

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const { items } = await blogService.list({ per_page: 50 });
      setBlogs(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBlogs(); }, []);
  useEffect(() => { if (!editing && title) setValue('slug', slugify(title)); }, [title, editing, setValue]);

  const onEdit = (b) => { setEditing(b); reset(b); };

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await blogService.update(editing.id, data);
        toast.success('Blog updated');
      } else {
        await blogService.create(data);
        toast.success('Blog created');
      }
      reset();
      setEditing(null);
      fetchBlogs();
    } catch {
      toast.error('Save failed');
    }
  };

  const handleDelete = async () => {
    try {
      await blogService.remove(deleteId);
      toast.success('Blog deleted');
      setDeleteId(null);
      fetchBlogs();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Created', render: (r) => formatDate(r.created_at) },
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
      <Helmet><title>Blogs — YULO Admin</title></Helmet>
      <PageHeader title="Blogs" subtitle="Manage blog posts and content" />

      <div className="row g-4">
        <div className="col-lg-5">
          <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
            <h6 className="mb-3">{editing ? 'Edit Post' : 'New Post'}</h6>
            <div className="mb-3"><label className="form-label">Title</label><input className="form-control" {...register('title', { required: true })} /></div>
            <div className="mb-3"><label className="form-label">Slug</label><input className="form-control" {...register('slug', { required: true })} /></div>
            <div className="mb-3"><label className="form-label">Excerpt</label><textarea className="form-control" rows={2} {...register('excerpt')} /></div>
            <div className="mb-3"><label className="form-label">Content</label><textarea className="form-control" rows={5} {...register('content')} /></div>
            <div className="mb-3"><label className="form-label">Featured Image URL</label><input className="form-control" {...register('featured_image')} /></div>
            <div className="mb-3">
              <label className="form-label">Status</label>
              <select className="form-select" {...register('status')}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-gold btn-sm">{editing ? 'Update' : 'Create'}</button>
              {editing && <button type="button" className="btn btn-light btn-sm" onClick={() => { setEditing(null); reset(); }}>Cancel</button>}
            </div>
          </form>
        </div>
        <div className="col-lg-7"><DataTable columns={columns} data={blogs} loading={loading} /></div>
      </div>

      <ConfirmModal show={!!deleteId} title="Delete Blog" message="Delete this post?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </>
  );
};

export default Blogs;
