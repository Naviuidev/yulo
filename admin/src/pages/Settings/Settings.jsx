import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import Loader from '../../components/common/Loader';
import settingsService from '../../services/settingsService';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await settingsService.get();
        reset(data || {});
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reset]);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await settingsService.update(data);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <>
      <Helmet><title>Settings — YULO Admin</title></Helmet>
      <PageHeader title="Settings" subtitle="Store configuration and preferences" />

      <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
        <div className="row g-4">
          <div className="col-md-6">
            <h6 className="text-gold mb-3">Store Information</h6>
            <div className="mb-3"><label className="form-label">Store Name</label><input className="form-control" {...register('store_name')} /></div>
            <div className="mb-3">
              <label className="form-label">Store Email</label>
              <input type="email" className="form-control" {...register('store_email')} />
              <div className="form-text">Used for new-order owner notifications (customer still gets the invoice).</div>
            </div>
            <div className="mb-3"><label className="form-label">Store Phone</label><input className="form-control" {...register('store_phone')} /></div>
            <div className="mb-3"><label className="form-label">Address</label><textarea className="form-control" rows={3} {...register('store_address')} /></div>
          </div>
          <div className="col-md-6">
            <h6 className="text-gold mb-3">Commerce Settings</h6>
            <div className="mb-3"><label className="form-label">Currency</label><input className="form-control" {...register('currency')} placeholder="INR" /></div>
            <div className="mb-3"><label className="form-label">Tax Rate (%)</label><input type="number" step="0.01" className="form-control" {...register('tax_rate')} /></div>
            <div className="mb-3"><label className="form-label">Free Shipping Threshold</label><input type="number" className="form-control" {...register('free_shipping_threshold')} /></div>
            <div className="mb-3"><label className="form-label">Default Shipping Cost</label><input type="number" className="form-control" {...register('default_shipping_cost')} /></div>
          </div>
          <div className="col-12">
            <h6 className="text-gold mb-3">Social & SEO</h6>
            <div className="row g-3">
              <div className="col-md-4"><label className="form-label">Facebook URL</label><input className="form-control" {...register('facebook_url')} /></div>
              <div className="col-md-4"><label className="form-label">Instagram URL</label><input className="form-control" {...register('instagram_url')} /></div>
              <div className="col-md-4"><label className="form-label">Meta Description</label><input className="form-control" {...register('meta_description')} /></div>
            </div>
          </div>
        </div>
        <button type="submit" className="btn btn-gold mt-4" disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </>
  );
};

export default Settings;
