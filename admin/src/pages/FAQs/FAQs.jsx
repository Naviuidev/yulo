import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import ConfirmModal from '../../components/common/ConfirmModal';
import faqService from '../../services/faqService';

const FAQs = () => {
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { question: '', answer: '', category: 'general', sort_order: 0, status: 'active' },
  });

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const { items } = await faqService.list({ per_page: 100 });
      setFaqs(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFaqs(); }, []);

  const onEdit = (f) => { setEditing(f); reset(f); };

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, sort_order: Number(data.sort_order) || 0 };
      if (editing) {
        await faqService.update(editing.id, payload);
        toast.success('FAQ updated');
      } else {
        await faqService.create(payload);
        toast.success('FAQ created');
      }
      reset();
      setEditing(null);
      fetchFaqs();
    } catch {
      toast.error('Save failed');
    }
  };

  const handleDelete = async () => {
    try {
      await faqService.remove(deleteId);
      toast.success('FAQ deleted');
      setDeleteId(null);
      fetchFaqs();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const columns = [
    { key: 'question', label: 'Question' },
    { key: 'category', label: 'Category' },
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
      <Helmet><title>FAQs — YULO Admin</title></Helmet>
      <PageHeader title="FAQs" subtitle="Manage frequently asked questions" />

      <div className="row g-4">
        <div className="col-lg-5">
          <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
            <h6 className="mb-3">{editing ? 'Edit FAQ' : 'Add FAQ'}</h6>
            <div className="mb-3"><label className="form-label">Question</label><input className="form-control" {...register('question', { required: true })} /></div>
            <div className="mb-3"><label className="form-label">Answer</label><textarea className="form-control" rows={4} {...register('answer', { required: true })} /></div>
            <div className="mb-3"><label className="form-label">Category</label><input className="form-control" {...register('category')} /></div>
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
        <div className="col-lg-7"><DataTable columns={columns} data={faqs} loading={loading} /></div>
      </div>

      <ConfirmModal show={!!deleteId} title="Delete FAQ" message="Delete this FAQ?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </>
  );
};

export default FAQs;
