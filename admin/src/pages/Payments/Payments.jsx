import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import PagePasswordGate from '../../components/common/PagePasswordGate';
import Loader from '../../components/common/Loader';
import paymentsService from '../../services/paymentsService';

const emptyForm = {
  app_id: '',
  secret_key: '',
  env: 'sandbox',
  webhook_url: '',
};

function PaymentsContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [secretKeySet, setSecretKeySet] = useState(false);
  const [suggestedWebhook, setSuggestedWebhook] = useState('');
  const { register, handleSubmit, reset, setValue, watch } = useForm({ defaultValues: emptyForm });
  const webhookUrl = watch('webhook_url');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await paymentsService.getCashfree();
        if (cancelled) return;
        setSecretKeySet(Boolean(data?.secret_key_set));
        setSuggestedWebhook(data?.suggested_webhook_url || '');
        reset({
          app_id: data?.app_id || '',
          secret_key: '',
          env: data?.env === 'production' ? 'production' : 'sandbox',
          webhook_url: data?.webhook_url || '',
        });
      } catch {
        if (!cancelled) toast.error('Failed to load payment settings');
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
      const saved = await paymentsService.updateCashfree({
        app_id: form.app_id?.trim() || '',
        secret_key: form.secret_key?.trim() || '',
        env: form.env || 'sandbox',
        webhook_url: form.webhook_url?.trim() || '',
      });
      setSecretKeySet(Boolean(saved?.secret_key_set));
      setSuggestedWebhook(saved?.suggested_webhook_url || suggestedWebhook);
      reset({
        app_id: saved?.app_id || form.app_id || '',
        secret_key: '',
        env: saved?.env === 'production' ? 'production' : 'sandbox',
        webhook_url: saved?.webhook_url || '',
      });
      toast.success('Cashfree settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  const useSuggestedWebhook = () => {
    if (suggestedWebhook) setValue('webhook_url', suggestedWebhook, { shouldDirty: true });
  };

  if (loading) return <Loader fullScreen />;

  return (
    <>
      <Helmet>
        <title>Payments — YULO Admin</title>
      </Helmet>
      <PageHeader
        title="Payments"
        subtitle="Configure Cashfree payment gateway credentials and webhook for checkout."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h6 className="text-gold mb-0">Cashfree</h6>
          <span className="badge yulo-badge yulo-badge--light">Sandbox + Production</span>
        </div>

        <p className="text-muted small mb-4">
          Add your Cashfree App ID and Secret Key from the Cashfree merchant dashboard.
          Use <strong>Sandbox</strong> for testing. Leave Secret Key blank when saving to keep the existing key.
        </p>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">App ID</label>
            <input
              className="form-control"
              placeholder="Enter Cashfree App ID"
              autoComplete="off"
              {...register('app_id')}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Secret Key</label>
            <input
              type="password"
              className="form-control"
              placeholder={secretKeySet ? '•••••••••••• (saved — enter new to replace)' : 'Enter Cashfree Secret Key'}
              autoComplete="new-password"
              {...register('secret_key')}
            />
            {secretKeySet ? (
              <div className="form-text">A secret key is already saved. Enter a new value only if you want to replace it.</div>
            ) : (
              <div className="form-text">Paste the Secret Key from Cashfree (Sandbox / Production).</div>
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label">Environment</label>
            <select className="form-select" {...register('env')}>
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </div>

          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
              <label className="form-label mb-0">Webhook URL (notify_url)</label>
              {suggestedWebhook ? (
                <button type="button" className="btn btn-link btn-sm p-0" onClick={useSuggestedWebhook}>
                  Use suggested URL
                </button>
              ) : null}
            </div>
            <input
              className="form-control"
              placeholder={suggestedWebhook || 'https://api.yourdomain.com/api/payments/cashfree/webhook'}
              autoComplete="off"
              {...register('webhook_url')}
            />
            <div className="form-text">
              Public HTTPS URL Cashfree calls after payment (even if the customer closes the browser).
              Also paste this same URL in the Cashfree dashboard webhook settings for production.
              Leave blank on localhost — return-page verify still works for local testing.
            </div>
            {suggestedWebhook && webhookUrl !== suggestedWebhook ? (
              <div className="form-text text-muted">Suggested: <code>{suggestedWebhook}</code></div>
            ) : null}
          </div>
        </div>

        <button type="submit" className="btn btn-gold mt-4" disabled={saving}>
          {saving ? 'Saving...' : 'Save Cashfree Settings'}
        </button>
      </form>
    </>
  );
}

export default function Payments() {
  return (
    <PagePasswordGate
      id="payments"
      password="Payments@1998"
      title="Payments locked"
      message="Enter the payments password to view and edit Cashfree credentials."
    >
      <PaymentsContent />
    </PagePasswordGate>
  );
}
