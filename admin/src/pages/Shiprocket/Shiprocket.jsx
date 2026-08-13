import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import Loader from '../../components/common/Loader';
import shiprocketService from '../../services/shiprocketService';

const emptyForm = {
  email: '',
  password: '',
  channel_id: '',
  pickup_location: '',
  enabled: false,
};

export default function Shiprocket() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);
  const { register, handleSubmit, reset } = useForm({ defaultValues: emptyForm });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await shiprocketService.get();
        if (cancelled) return;
        setPasswordSet(Boolean(data?.password_set));
        reset({
          email: data?.email || '',
          password: '',
          channel_id: data?.channel_id || '',
          pickup_location: data?.pickup_location || '',
          enabled: Boolean(data?.enabled),
        });
      } catch {
        if (!cancelled) toast.error('Failed to load Shiprocket settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reset]);

  const onSubmit = async (form) => {
    setSaving(true);
    try {
      const saved = await shiprocketService.update({
        email: form.email?.trim() || '',
        password: form.password?.trim() || '',
        channel_id: form.channel_id?.trim() || '',
        pickup_location: form.pickup_location?.trim() || '',
        enabled: Boolean(form.enabled),
      });
      setPasswordSet(Boolean(saved?.password_set));
      reset({
        email: saved?.email || form.email || '',
        password: '',
        channel_id: saved?.channel_id || '',
        pickup_location: saved?.pickup_location || '',
        enabled: Boolean(saved?.enabled),
      });
      toast.success('Shiprocket settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save Shiprocket settings');
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    setTesting(true);
    try {
      await shiprocketService.testConnection();
      toast.success('Shiprocket connection successful');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Shiprocket connection failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <>
      <Helmet>
        <title>Shiprocket — YULO Admin</title>
      </Helmet>
      <PageHeader
        title="Shiprocket"
        subtitle="Configure Shiprocket shipping API credentials for order delivery."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h6 className="text-gold mb-0">API Configuration</h6>
          <div className="form-check form-switch mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              id="shiprocket-enabled"
              {...register('enabled')}
            />
            <label className="form-check-label" htmlFor="shiprocket-enabled">
              Enable Shiprocket
            </label>
          </div>
        </div>

        <p className="text-muted small mb-4">
          Use your Shiprocket panel login email and password (API user). These are used to generate an auth token
          for creating shipments and tracking. Leave password blank when saving to keep the existing password.
        </p>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">API Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="shiprocket-account@email.com"
              autoComplete="off"
              {...register('email')}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">API Password</label>
            <input
              type="password"
              className="form-control"
              placeholder={passwordSet ? '•••••••••••• (saved — enter new to replace)' : 'Enter Shiprocket password'}
              autoComplete="new-password"
              {...register('password')}
            />
            {passwordSet ? (
              <div className="form-text">A password is already saved. Enter a new value only to replace it.</div>
            ) : (
              <div className="form-text">Password from your Shiprocket account / API user.</div>
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label">Channel ID (optional)</label>
            <input
              className="form-control"
              placeholder="Custom channel ID if you use one"
              autoComplete="off"
              {...register('channel_id')}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Default Pickup Location (optional)</label>
            <input
              className="form-control"
              placeholder="e.g. Primary / Warehouse name in Shiprocket"
              autoComplete="off"
              {...register('pickup_location')}
            />
            <div className="form-text">Must match a pickup location nickname configured in Shiprocket.</div>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 mt-4">
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? 'Saving...' : 'Save Shiprocket Settings'}
          </button>
          <button
            type="button"
            className="btn btn-outline-dark"
            onClick={onTest}
            disabled={testing || saving}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </form>
    </>
  );
}
