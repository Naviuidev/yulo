import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import PagePasswordGate from '../../components/common/PagePasswordGate';
import ConfirmModal from '../../components/common/ConfirmModal';
import Loader from '../../components/common/Loader';
import paymentsService from '../../services/paymentsService';

function IconRazorpay() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path
        fill="#072654"
        d="M22.436 0l-11.91 7.773-1.174 4.276 6.625-4.297L11.65 24h4.391l6.395-24zM14.26 10.098L3.389 17.166 1.564 24h9.008l3.688-13.902Z"
      />
    </svg>
  );
}

function IconPhonePe() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path
        fill="#5f259f"
        d="M10.206 9.941h2.949v4.692c-.402.201-.938.268-1.34.268-1.072 0-1.609-.536-1.609-1.743V9.941zm13.47 4.816c-1.523 6.449-7.985 10.442-14.433 8.919C2.794 22.154-1.199 15.691.324 9.243 1.847 2.794 8.309-1.199 14.757.324c6.449 1.523 10.442 7.985 8.919 14.433zm-6.231-5.888a.887.887 0 0 0-.871-.871h-1.609l-3.686-4.222c-.335-.402-.871-.536-1.407-.402l-1.274.401c-.201.067-.268.335-.134.469l4.021 3.82H6.386c-.201 0-.335.134-.335.335v.67c0 .469.402.871.871.871h.938v3.217c0 2.413 1.273 3.82 3.418 3.82.67 0 1.206-.067 1.877-.335v2.145c0 .603.469 1.072 1.072 1.072h.938a.432.432 0 0 0 .402-.402V9.874h1.542c.201 0 .335-.134.335-.335v-.67z"
      />
    </svg>
  );
}

function IconPaytm() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path
        fill="#00BAF2"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.2 13.4h-1.5v-4.2h-.9c-.9 0-1.5.5-1.5 1.3v2.9H10.8v-5.6h1.4v.4c.4-.3.9-.5 1.5-.5h2.5v5.7zM8.6 9.2c.7 0 1.2.5 1.2 1.2S9.3 11.6 8.6 11.6 7.4 11.1 7.4 10.4s.5-1.2 1.2-1.2zm.8 6.4H7.8v-3.8h1.6v3.8z"
      />
    </svg>
  );
}

function IconCashfree() {
  return (
    <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#1B8F6E" />
      <path
        fill="#fff"
        d="M14 24c0-5.5 4.5-10 10-10s10 4.5 10 10-4.5 10-10 10c-1.8 0-3.5-.5-5-1.3l-4.2 1.4 1.5-3.9A9.9 9.9 0 0 1 14 24zm6.2-2.8h7.6v2.1h-7.6v-2.1zm0 4.2h5.4v2.1h-5.4V25.4z"
      />
    </svg>
  );
}

function IconPayU() {
  return (
    <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#4A90D9" />
      <text
        x="24"
        y="30"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="16"
        fontWeight="700"
        fill="#fff"
      >
        PayU
      </text>
    </svg>
  );
}

const GATEWAYS = [
  {
    id: 'razorpay',
    name: 'Razorpay',
    accent: '#072654',
    Icon: IconRazorpay,
    ready: true,
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    accent: '#5f259f',
    Icon: IconPhonePe,
    ready: true,
  },
  {
    id: 'paytm',
    name: 'Paytm',
    accent: '#00BAF2',
    Icon: IconPaytm,
    ready: true,
  },
  {
    id: 'cashfree',
    name: 'Cashfree',
    accent: '#1B8F6E',
    Icon: IconCashfree,
    ready: true,
  },
  {
    id: 'payu',
    name: 'PayU',
    accent: '#4A90D9',
    Icon: IconPayU,
    ready: true,
  },
];

const cashfreeEmpty = {
  app_id: '',
  secret_key: '',
  env: 'sandbox',
  webhook_url: '',
};

const phonepeEmpty = {
  client_id: '',
  client_secret: '',
  client_version: '1',
  env: 'sandbox',
};

const razorpayEmpty = {
  key_id: '',
  key_secret: '',
  env: 'sandbox',
  webhook_secret: '',
};

const paytmEmpty = {
  mid: '',
  merchant_key: '',
  env: 'sandbox',
  website: 'WEBSTAGING',
  webhook_url: '',
};

const payuEmpty = {
  merchant_key: '',
  merchant_salt: '',
  env: 'sandbox',
};

function isGatewayConflict(err) {
  const data = err?.response?.data?.data;
  return err?.response?.status === 409 && data?.code === 'GATEWAY_PUBLISHED_CONFLICT';
}

function GatewayCards({ gateways, overview, onSelect }) {
  const byId = useMemo(() => {
    const map = {};
    (overview?.gateways || []).forEach((g) => {
      map[g.id] = g;
    });
    return map;
  }, [overview]);

  return (
    <div className="yulo-pay-gateways">
      {gateways.map((g) => {
        const Icon = g.Icon;
        const live = byId[g.id];
        const published = Boolean(live?.published);
        const configured = Boolean(live?.configured);
        let badge = g.ready ? 'Setup' : 'Soon';
        let badgeClass = g.ready ? '' : '';
        if (published) {
          badge = 'Published';
          badgeClass = 'is-live';
        } else if (configured) {
          badge = 'Saved';
          badgeClass = 'is-ready';
        } else if (g.ready) {
          badge = 'Setup';
          badgeClass = 'is-ready';
        }

        return (
          <button
            key={g.id}
            type="button"
            className={`yulo-pay-gateway ${g.ready || configured ? 'is-ready' : ''} ${published ? 'is-published' : ''}`}
            onClick={() => onSelect(g.id)}
            style={{ '--pay-accent': g.accent }}
          >
            <span className="yulo-pay-gateway__icon" aria-hidden="true">
              <Icon />
            </span>
            <span className="yulo-pay-gateway__body">
              <strong>{g.name}</strong>
            </span>
            <span className={`yulo-pay-gateway__badge ${badgeClass}`}>{badge}</span>
            <i className="bi bi-chevron-right yulo-pay-gateway__chevron" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

function PublishBar({ gatewayId, gatewayLabel, published, canPublish, publishing, onPublish, onUnpublish }) {
  if (published) {
    return (
      <div className="yulo-pay-publish alert alert-success d-flex flex-wrap align-items-center justify-content-between gap-2 mt-4 mb-0">
        <span>
          <strong>{gatewayLabel}</strong> is published on the website checkout.
        </span>
        <button type="button" className="btn btn-outline-dark btn-sm" disabled={publishing} onClick={onUnpublish}>
          {publishing ? 'Working…' : 'Unpublish'}
        </button>
      </div>
    );
  }

  if (!canPublish) return null;

  return (
    <div className="yulo-pay-publish alert alert-warning d-flex flex-wrap align-items-center justify-content-between gap-2 mt-4 mb-0">
      <span>
        Credentials saved. Publish <strong>{gatewayLabel}</strong> to collect payments on the storefront.
      </span>
      <button type="button" className="btn btn-gold btn-sm" disabled={publishing} onClick={onPublish}>
        {publishing ? 'Publishing…' : 'Publish on website'}
      </button>
    </div>
  );
}

function useGatewayConflict() {
  const [conflict, setConflict] = useState(null);
  const [busy, setBusy] = useState(false);

  const clear = () => setConflict(null);

  const openFromError = (err, pendingPayload, mode = 'save') => {
    if (!isGatewayConflict(err)) return false;
    const data = err.response.data.data;
    setConflict({
      mode,
      pendingPayload,
      publishedLabel: data.published_gateway_label || data.published_gateway || 'the current gateway',
      requestedLabel: data.requested_gateway_label || data.requested_gateway || 'this gateway',
      message: err.response?.data?.message || '',
    });
    return true;
  };

  return { conflict, setConflict, clear, openFromError, busy, setBusy };
}

function CashfreeConfig({ onBack, onStatusChange }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [secretKeySet, setSecretKeySet] = useState(false);
  const [suggestedWebhook, setSuggestedWebhook] = useState('');
  const [published, setPublished] = useState(false);
  const [canPublish, setCanPublish] = useState(false);
  const { register, handleSubmit, reset, setValue, watch, getValues } = useForm({ defaultValues: cashfreeEmpty });
  const webhookUrl = watch('webhook_url');
  const conflictState = useGatewayConflict();

  const applySaved = (data, formFallback = {}) => {
    setSecretKeySet(Boolean(data?.secret_key_set));
    setSuggestedWebhook(data?.suggested_webhook_url || suggestedWebhook);
    setPublished(Boolean(data?.published));
    setCanPublish(Boolean(data?.can_publish) || (Boolean(data?.configured) && !data?.published));
    reset({
      app_id: data?.app_id || formFallback.app_id || '',
      secret_key: '',
      env: data?.env === 'production' ? 'production' : 'sandbox',
      webhook_url: data?.webhook_url || formFallback.webhook_url || '',
    });
    onStatusChange?.();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await paymentsService.getCashfree();
        if (cancelled) return;
        applySaved(data);
      } catch {
        if (!cancelled) toast.error('Failed to load payment settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);

  const save = async (form, unpublishCurrent = false) => {
    setSaving(true);
    try {
      const saved = await paymentsService.updateCashfree({
        app_id: form.app_id?.trim() || '',
        secret_key: form.secret_key?.trim() || '',
        env: form.env || 'sandbox',
        webhook_url: form.webhook_url?.trim() || '',
        unpublish_current: unpublishCurrent ? 1 : 0,
      });
      conflictState.clear();
      applySaved(saved, form);
      toast.success('Cashfree settings saved');
    } catch (err) {
      if (conflictState.openFromError(err, form, 'save')) return;
      toast.error(err.response?.data?.message || 'Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (form) => save(form, false);

  const confirmConflict = async () => {
    if (!conflictState.conflict) return;
    conflictState.setBusy(true);
    try {
      if (conflictState.conflict.mode === 'publish') {
        setPublishing(true);
        await paymentsService.publish('cashfree', true);
        conflictState.clear();
        const data = await paymentsService.getCashfree();
        applySaved(data);
        toast.success('Cashfree published on the website');
      } else {
        await save(conflictState.conflict.pendingPayload || getValues(), true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not continue');
    } finally {
      conflictState.setBusy(false);
      setPublishing(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await paymentsService.publish('cashfree', false);
      const data = await paymentsService.getCashfree();
      applySaved(data);
      toast.success('Cashfree published on the website');
    } catch (err) {
      if (conflictState.openFromError(err, null, 'publish')) return;
      toast.error(err.response?.data?.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    try {
      await paymentsService.unpublish();
      const data = await paymentsService.getCashfree();
      applySaved(data);
      toast.success('Payment gateway unpublished');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unpublish');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  const c = conflictState.conflict;

  return (
    <div className="yulo-pay-detail">
      <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3 mb-3" onClick={onBack}>
        ← All gateways
      </button>

      <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <IconCashfree />
            <h6 className="text-gold mb-0">Cashfree</h6>
          </div>
          <span className={`badge yulo-badge ${published ? 'yulo-badge--dark' : 'yulo-badge--light'}`}>
            {published ? 'Published · Cashfree' : 'Cashfree'}
          </span>
        </div>

        <p className="text-muted small mb-4">
          Add your Cashfree App ID and Secret Key from the Cashfree merchant dashboard. Use{' '}
          <strong>Sandbox</strong> for testing. Leave Secret Key blank when saving to keep the existing key.
        </p>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">App ID / Client ID</label>
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
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0"
                  onClick={() => setValue('webhook_url', suggestedWebhook, { shouldDirty: true })}
                >
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
              Public HTTPS URL Cashfree calls after payment. Leave blank on localhost — return-page verify still works
              for local testing.
            </div>
            {suggestedWebhook && webhookUrl !== suggestedWebhook ? (
              <div className="form-text text-muted">
                Suggested: <code>{suggestedWebhook}</code>
              </div>
            ) : null}
          </div>
        </div>

        <button type="submit" className="btn btn-gold mt-4" disabled={saving}>
          {saving ? 'Saving...' : 'Save Cashfree Settings'}
        </button>

        <PublishBar
          gatewayId="cashfree"
          gatewayLabel="Cashfree"
          published={published}
          canPublish={canPublish}
          publishing={publishing}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
        />
      </form>

      <ConfirmModal
        show={Boolean(c)}
        title="Unpublish current gateway?"
        message={
          c
            ? `${c.publishedLabel} is currently published on the website. Unpublish it, then ${
                c.mode === 'publish' ? `publish ${c.requestedLabel}` : `save ${c.requestedLabel} settings`
              }?`
            : ''
        }
        confirmLabel={c?.mode === 'publish' ? 'Unpublish & publish' : 'Unpublish & save'}
        cancelLabel="Cancel"
        variant="dark"
        confirmDisabled={conflictState.busy || saving || publishing}
        onConfirm={confirmConflict}
        onCancel={conflictState.clear}
      />
    </div>
  );
}

function RazorpayConfig({ onBack, onStatusChange }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [secretSet, setSecretSet] = useState(false);
  const [webhookSecretSet, setWebhookSecretSet] = useState(false);
  const [published, setPublished] = useState(false);
  const [canPublish, setCanPublish] = useState(false);
  const [suggestedWebhook, setSuggestedWebhook] = useState('');
  const { register, handleSubmit, reset, getValues } = useForm({ defaultValues: razorpayEmpty });
  const conflictState = useGatewayConflict();

  const applySaved = (data, formFallback = {}) => {
    setSecretSet(Boolean(data?.key_secret_set));
    setWebhookSecretSet(Boolean(data?.webhook_secret_set));
    setPublished(Boolean(data?.published));
    setCanPublish(Boolean(data?.can_publish) || (Boolean(data?.configured) && !data?.published));
    setSuggestedWebhook(data?.suggested_webhook_url || '');
    reset({
      key_id: data?.key_id || formFallback.key_id || '',
      key_secret: '',
      env: data?.env === 'production' ? 'production' : 'sandbox',
      webhook_secret: '',
    });
    onStatusChange?.();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await paymentsService.getRazorpay();
        if (cancelled) return;
        applySaved(data);
      } catch {
        if (!cancelled) toast.error('Failed to load Razorpay settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);

  const save = async (form, unpublishCurrent = false) => {
    setSaving(true);
    try {
      const saved = await paymentsService.updateRazorpay({
        key_id: form.key_id?.trim() || '',
        key_secret: form.key_secret?.trim() || '',
        env: form.env || 'sandbox',
        webhook_secret: form.webhook_secret?.trim() || '',
        unpublish_current: unpublishCurrent ? 1 : 0,
      });
      conflictState.clear();
      applySaved(saved, form);
      toast.success('Razorpay settings saved');
    } catch (err) {
      if (conflictState.openFromError(err, form, 'save')) return;
      toast.error(err.response?.data?.message || 'Failed to save Razorpay settings');
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (form) => save(form, false);

  const confirmConflict = async () => {
    if (!conflictState.conflict) return;
    conflictState.setBusy(true);
    try {
      if (conflictState.conflict.mode === 'publish') {
        setPublishing(true);
        await paymentsService.publish('razorpay', true);
        conflictState.clear();
        const data = await paymentsService.getRazorpay();
        applySaved(data);
        toast.success('Razorpay published on the website');
      } else {
        await save(conflictState.conflict.pendingPayload || getValues(), true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not continue');
    } finally {
      conflictState.setBusy(false);
      setPublishing(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await paymentsService.publish('razorpay', false);
      const data = await paymentsService.getRazorpay();
      applySaved(data);
      toast.success('Razorpay published on the website');
    } catch (err) {
      if (conflictState.openFromError(err, null, 'publish')) return;
      toast.error(err.response?.data?.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    try {
      await paymentsService.unpublish();
      const data = await paymentsService.getRazorpay();
      applySaved(data);
      toast.success('Payment gateway unpublished');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unpublish');
    } finally {
      setPublishing(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await paymentsService.testRazorpay();
      toast.success('Razorpay credentials verified');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Razorpay credential test failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  const c = conflictState.conflict;

  return (
    <div className="yulo-pay-detail">
      <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3 mb-3" onClick={onBack}>
        ← All gateways
      </button>

      <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <IconRazorpay />
            <h6 className="text-gold mb-0">Razorpay</h6>
          </div>
          <span className={`badge yulo-badge ${published ? 'yulo-badge--dark' : 'yulo-badge--light'}`}>
            {published ? 'Published · Checkout' : 'Standard Checkout'}
          </span>
        </div>

        <p className="text-muted small mb-4">
          Add your Razorpay <strong>Key ID</strong> and <strong>Key Secret</strong> from the Razorpay Dashboard → API
          Keys. Use <code>rzp_test_…</code> for sandbox, then publish to collect payments on the website.
        </p>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Key ID</label>
            <input
              className="form-control"
              placeholder="rzp_test_•••• or rzp_live_••••"
              autoComplete="off"
              {...register('key_id', { required: true })}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Key Secret</label>
            <input
              type="password"
              className="form-control"
              placeholder={secretSet ? '•••••••••••• (saved — enter new to replace)' : 'Enter Key Secret'}
              autoComplete="new-password"
              {...register('key_secret')}
            />
            {secretSet ? (
              <div className="form-text">A key secret is already saved. Enter a new value only to replace it.</div>
            ) : (
              <div className="form-text">Required the first time you save.</div>
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label">Environment</label>
            <select className="form-select" {...register('env')}>
              <option value="sandbox">Test (sandbox)</option>
              <option value="production">Live (production)</option>
            </select>
            <div className="form-text">Auto-switches from Key ID prefix when you save (`rzp_test_` / `rzp_live_`).</div>
          </div>

          <div className="col-md-6">
            <label className="form-label">Webhook Secret (optional)</label>
            <input
              type="password"
              className="form-control"
              placeholder={
                webhookSecretSet ? '•••••••••••• (saved — enter new to replace)' : 'whsec_•••• (optional)'
              }
              autoComplete="new-password"
              {...register('webhook_secret')}
            />
            <div className="form-text">
              From Razorpay Dashboard → Webhooks. Suggested URL:{' '}
              <code>{suggestedWebhook || 'https://api.yourdomain.com/api/payments/razorpay/webhook'}</code>
            </div>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 mt-4">
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? 'Saving...' : 'Save Razorpay Settings'}
          </button>
          <button
            type="button"
            className="btn btn-outline-dark"
            disabled={testing || saving || !secretSet}
            onClick={handleTest}
          >
            {testing ? 'Testing…' : 'Test connection'}
          </button>
        </div>

        <PublishBar
          gatewayId="razorpay"
          gatewayLabel="Razorpay"
          published={published}
          canPublish={canPublish}
          publishing={publishing}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
        />
      </form>

      <ConfirmModal
        show={Boolean(c)}
        title="Unpublish current gateway?"
        message={
          c
            ? `${c.publishedLabel} is currently published on the website. Unpublish it, then ${
                c.mode === 'publish' ? `publish ${c.requestedLabel}` : `configure ${c.requestedLabel}`
              }?`
            : ''
        }
        confirmLabel={c?.mode === 'publish' ? 'Unpublish & publish' : 'Unpublish & save'}
        cancelLabel="Cancel"
        variant="dark"
        confirmDisabled={conflictState.busy || saving || publishing}
        onConfirm={confirmConflict}
        onCancel={conflictState.clear}
      />
    </div>
  );
}

function PhonePeConfig({ onBack, onStatusChange }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [secretSet, setSecretSet] = useState(false);
  const [published, setPublished] = useState(false);
  const [canPublish, setCanPublish] = useState(false);
  const [redirectHint, setRedirectHint] = useState('');
  const { register, handleSubmit, reset, getValues } = useForm({ defaultValues: phonepeEmpty });
  const conflictState = useGatewayConflict();

  const applySaved = (data, formFallback = {}) => {
    setSecretSet(Boolean(data?.client_secret_set));
    setPublished(Boolean(data?.published));
    setCanPublish(Boolean(data?.can_publish) || (Boolean(data?.configured) && !data?.published));
    setRedirectHint(data?.suggested_redirect_url || '');
    reset({
      client_id: data?.client_id || formFallback.client_id || '',
      client_secret: '',
      client_version: data?.client_version || formFallback.client_version || '1',
      env: data?.env === 'production' ? 'production' : 'sandbox',
    });
    onStatusChange?.();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await paymentsService.getPhonePe();
        if (cancelled) return;
        applySaved(data);
      } catch {
        if (!cancelled) toast.error('Failed to load PhonePe settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);

  const save = async (form, unpublishCurrent = false) => {
    setSaving(true);
    try {
      const saved = await paymentsService.updatePhonePe({
        client_id: form.client_id?.trim() || '',
        client_secret: form.client_secret?.trim() || '',
        client_version: form.client_version?.trim() || '1',
        env: form.env || 'sandbox',
        unpublish_current: unpublishCurrent ? 1 : 0,
      });
      conflictState.clear();
      applySaved(saved, form);
      toast.success('PhonePe settings saved');
    } catch (err) {
      if (conflictState.openFromError(err, form, 'save')) return;
      toast.error(err.response?.data?.message || 'Failed to save PhonePe settings');
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (form) => save(form, false);

  const confirmConflict = async () => {
    if (!conflictState.conflict) return;
    conflictState.setBusy(true);
    try {
      if (conflictState.conflict.mode === 'publish') {
        setPublishing(true);
        await paymentsService.publish('phonepe', true);
        conflictState.clear();
        const data = await paymentsService.getPhonePe();
        applySaved(data);
        toast.success('PhonePe published on the website');
      } else {
        await save(conflictState.conflict.pendingPayload || getValues(), true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not continue');
    } finally {
      conflictState.setBusy(false);
      setPublishing(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await paymentsService.publish('phonepe', false);
      const data = await paymentsService.getPhonePe();
      applySaved(data);
      toast.success('PhonePe published on the website');
    } catch (err) {
      if (conflictState.openFromError(err, null, 'publish')) return;
      toast.error(err.response?.data?.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    try {
      await paymentsService.unpublish();
      const data = await paymentsService.getPhonePe();
      applySaved(data);
      toast.success('Payment gateway unpublished');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unpublish');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  const c = conflictState.conflict;

  return (
    <div className="yulo-pay-detail">
      <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3 mb-3" onClick={onBack}>
        ← All gateways
      </button>

      <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <IconPhonePe />
            <h6 className="text-gold mb-0">PhonePe</h6>
          </div>
          <span className={`badge yulo-badge ${published ? 'yulo-badge--dark' : 'yulo-badge--light'}`}>
            {published ? 'Published · v2' : 'Standard Checkout v2'}
          </span>
        </div>

        <p className="text-muted small mb-4">
          Use PhonePe <strong>Client ID</strong> and <strong>Client Secret</strong> (OAuth). Salt key is not required
          for the latest Standard Checkout API. Use Sandbox credentials for testing, then publish to enable checkout on
          the website.
        </p>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Client ID</label>
            <input
              className="form-control"
              placeholder="e.g. SAND24ONLINE_••••"
              autoComplete="off"
              {...register('client_id', { required: true })}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Client Secret</label>
            <input
              type="password"
              className="form-control"
              placeholder={secretSet ? '•••••••••••• (saved — enter new to replace)' : 'Enter Client Secret'}
              autoComplete="new-password"
              {...register('client_secret')}
            />
            {secretSet ? (
              <div className="form-text">A client secret is already saved. Enter a new value only to replace it.</div>
            ) : (
              <div className="form-text">Required the first time you save. From PhonePe merchant dashboard (Sandbox).</div>
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label">Client Version</label>
            <input className="form-control" placeholder="1" autoComplete="off" {...register('client_version')} />
            <div className="form-text">Usually <code>1</code> for sandbox apps.</div>
          </div>

          <div className="col-md-6">
            <label className="form-label">Environment</label>
            <select className="form-select" {...register('env')}>
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </div>

          {redirectHint ? (
            <div className="col-12">
              <label className="form-label">Customer return URL</label>
              <input className="form-control" value={redirectHint} readOnly />
              <div className="form-text">
                PhonePe redirects buyers here after payment. Configured automatically from your storefront URL — no salt
                key needed.
              </div>
            </div>
          ) : null}
        </div>

        <button type="submit" className="btn btn-gold mt-4" disabled={saving}>
          {saving ? 'Saving...' : 'Save PhonePe Settings'}
        </button>

        <PublishBar
          gatewayId="phonepe"
          gatewayLabel="PhonePe"
          published={published}
          canPublish={canPublish}
          publishing={publishing}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
        />
      </form>

      <ConfirmModal
        show={Boolean(c)}
        title="Unpublish current gateway?"
        message={
          c
            ? `${c.publishedLabel} is currently published on the website. Unpublish it, then ${
                c.mode === 'publish' ? `publish ${c.requestedLabel}` : `configure ${c.requestedLabel}`
              }?`
            : ''
        }
        confirmLabel={c?.mode === 'publish' ? 'Unpublish & publish' : 'Unpublish & save'}
        cancelLabel="Cancel"
        variant="dark"
        confirmDisabled={conflictState.busy || saving || publishing}
        onConfirm={confirmConflict}
        onCancel={conflictState.clear}
      />
    </div>
  );
}

function PaytmConfig({ onBack, onStatusChange }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [secretSet, setSecretSet] = useState(false);
  const [published, setPublished] = useState(false);
  const [canPublish, setCanPublish] = useState(false);
  const [suggestedWebhook, setSuggestedWebhook] = useState('');
  const [callbackHint, setCallbackHint] = useState('');
  const { register, handleSubmit, reset, setValue, watch, getValues } = useForm({ defaultValues: paytmEmpty });
  const webhookUrl = watch('webhook_url');
  const conflictState = useGatewayConflict();

  const applySaved = (data, formFallback = {}) => {
    setSecretSet(Boolean(data?.merchant_key_set));
    setPublished(Boolean(data?.published));
    setCanPublish(Boolean(data?.can_publish) || (Boolean(data?.configured) && !data?.published));
    setSuggestedWebhook(data?.suggested_webhook_url || '');
    setCallbackHint(data?.suggested_callback_url || '');
    reset({
      mid: data?.mid || formFallback.mid || '',
      merchant_key: '',
      env: data?.env === 'production' ? 'production' : 'sandbox',
      website: data?.website || formFallback.website || (data?.env === 'production' ? 'DEFAULT' : 'WEBSTAGING'),
      webhook_url: data?.webhook_url || formFallback.webhook_url || '',
    });
    onStatusChange?.();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await paymentsService.getPaytm();
        if (cancelled) return;
        applySaved(data);
      } catch {
        if (!cancelled) toast.error('Failed to load Paytm settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);

  const save = async (form, unpublishCurrent = false) => {
    setSaving(true);
    try {
      const saved = await paymentsService.updatePaytm({
        mid: form.mid?.trim() || '',
        merchant_key: form.merchant_key?.trim() || '',
        env: form.env || 'sandbox',
        website: form.website?.trim() || '',
        webhook_url: form.webhook_url?.trim() || '',
        unpublish_current: unpublishCurrent ? 1 : 0,
      });
      conflictState.clear();
      applySaved(saved, form);
      toast.success('Paytm settings saved');
    } catch (err) {
      if (conflictState.openFromError(err, form, 'save')) return;
      toast.error(err.response?.data?.message || 'Failed to save Paytm settings');
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (form) => save(form, false);

  const confirmConflict = async () => {
    if (!conflictState.conflict) return;
    conflictState.setBusy(true);
    try {
      if (conflictState.conflict.mode === 'publish') {
        setPublishing(true);
        await paymentsService.publish('paytm', true);
        conflictState.clear();
        const data = await paymentsService.getPaytm();
        applySaved(data);
        toast.success('Paytm published on the website');
      } else {
        await save(conflictState.conflict.pendingPayload || getValues(), true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not continue');
    } finally {
      conflictState.setBusy(false);
      setPublishing(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await paymentsService.publish('paytm', false);
      const data = await paymentsService.getPaytm();
      applySaved(data);
      toast.success('Paytm published on the website');
    } catch (err) {
      if (conflictState.openFromError(err, null, 'publish')) return;
      toast.error(err.response?.data?.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    try {
      await paymentsService.unpublish();
      const data = await paymentsService.getPaytm();
      applySaved(data);
      toast.success('Payment gateway unpublished');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unpublish');
    } finally {
      setPublishing(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await paymentsService.testPaytm();
      toast.success('Paytm credentials verified with Paytm sandbox/production API');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Paytm credential test failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  const c = conflictState.conflict;

  return (
    <div className="yulo-pay-detail">
      <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3 mb-3" onClick={onBack}>
        ← All gateways
      </button>

      <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <IconPaytm />
            <h6 className="text-gold mb-0">Paytm</h6>
          </div>
          <span className={`badge yulo-badge ${published ? 'yulo-badge--dark' : 'yulo-badge--light'}`}>
            {published ? 'Published · JS Checkout' : 'JS Checkout'}
          </span>
        </div>

        <p className="text-muted small mb-4">
          Add your Paytm <strong>Merchant ID (MID)</strong> and <strong>Merchant Key</strong> from the Paytm dashboard.
          Use Sandbox for testing, then publish to collect payments on the website.
        </p>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Merchant ID (MID)</label>
            <input
              className="form-control"
              placeholder="Enter Paytm MID"
              autoComplete="off"
              {...register('mid', { required: true })}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Merchant Key</label>
            <input
              type="password"
              className="form-control"
              placeholder={secretSet ? '•••••••••••• (saved — enter new to replace)' : 'Enter Merchant Key'}
              autoComplete="new-password"
              {...register('merchant_key')}
            />
            {secretSet ? (
              <div className="form-text">A merchant key is already saved. Enter a new value only to replace it.</div>
            ) : (
              <div className="form-text">Required the first time you save. From Paytm Dashboard → API Keys.</div>
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label">Environment</label>
            <select
              className="form-select"
              {...register('env', {
                onChange: (e) => {
                  const next = e.target.value;
                  const currentWebsite = getValues('website');
                  if (!currentWebsite || currentWebsite === 'WEBSTAGING' || currentWebsite === 'DEFAULT') {
                    setValue('website', next === 'production' ? 'DEFAULT' : 'WEBSTAGING', { shouldDirty: true });
                  }
                },
              })}
            >
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </div>

          <div className="col-md-6">
            <label className="form-label">Website Name</label>
            <input className="form-control" placeholder="WEBSTAGING or DEFAULT" autoComplete="off" {...register('website')} />
            <div className="form-text">
              Usually <code>WEBSTAGING</code> (sandbox) or <code>DEFAULT</code> (production), as shown in Paytm.
            </div>
          </div>

          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
              <label className="form-label mb-0">Webhook / Callback URL (optional)</label>
              {suggestedWebhook ? (
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0"
                  onClick={() => setValue('webhook_url', suggestedWebhook, { shouldDirty: true })}
                >
                  Use suggested URL
                </button>
              ) : null}
            </div>
            <input
              className="form-control"
              placeholder={suggestedWebhook || 'https://api.yourdomain.com/api/payments/paytm/callback'}
              autoComplete="off"
              {...register('webhook_url')}
            />
            <div className="form-text">
              Optional server webhook. Checkout also verifies on the customer return page. Leave blank on localhost.
            </div>
            {suggestedWebhook && webhookUrl !== suggestedWebhook ? (
              <div className="form-text text-muted">
                Suggested: <code>{suggestedWebhook}</code>
              </div>
            ) : null}
          </div>

          {callbackHint ? (
            <div className="col-12">
              <label className="form-label">Customer return URL</label>
              <input className="form-control" value={callbackHint} readOnly />
              <div className="form-text">Buyers return here after Paytm checkout. Configured automatically from your storefront URL.</div>
            </div>
          ) : null}
        </div>

        <div className="d-flex flex-wrap gap-2 mt-4">
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? 'Saving...' : 'Save Paytm Settings'}
          </button>
          <button
            type="button"
            className="btn btn-outline-dark"
            disabled={testing || saving || !secretSet}
            onClick={handleTest}
          >
            {testing ? 'Testing…' : 'Test connection'}
          </button>
        </div>

        <PublishBar
          gatewayId="paytm"
          gatewayLabel="Paytm"
          published={published}
          canPublish={canPublish}
          publishing={publishing}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
        />
      </form>

      <ConfirmModal
        show={Boolean(c)}
        title="Unpublish current gateway?"
        message={
          c
            ? `${c.publishedLabel} is currently published on the website. Unpublish it, then ${
                c.mode === 'publish' ? `publish ${c.requestedLabel}` : `configure ${c.requestedLabel}`
              }?`
            : ''
        }
        confirmLabel={c?.mode === 'publish' ? 'Unpublish & publish' : 'Unpublish & save'}
        cancelLabel="Cancel"
        variant="dark"
        confirmDisabled={conflictState.busy || saving || publishing}
        onConfirm={confirmConflict}
        onCancel={conflictState.clear}
      />
    </div>
  );
}

function PayUConfig({ onBack, onStatusChange }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saltSet, setSaltSet] = useState(false);
  const [published, setPublished] = useState(false);
  const [canPublish, setCanPublish] = useState(false);
  const [callbackHint, setCallbackHint] = useState('');
  const [returnHint, setReturnHint] = useState('');
  const { register, handleSubmit, reset, getValues } = useForm({ defaultValues: payuEmpty });
  const conflictState = useGatewayConflict();

  const applySaved = (data, formFallback = {}) => {
    setSaltSet(Boolean(data?.merchant_salt_set));
    setPublished(Boolean(data?.published));
    setCanPublish(Boolean(data?.can_publish) || (Boolean(data?.configured) && !data?.published));
    setCallbackHint(data?.suggested_callback_url || '');
    setReturnHint(data?.suggested_return_url || '');
    reset({
      merchant_key: data?.merchant_key || formFallback.merchant_key || '',
      merchant_salt: '',
      env: data?.env === 'production' ? 'production' : 'sandbox',
    });
    onStatusChange?.();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await paymentsService.getPayU();
        if (cancelled) return;
        applySaved(data);
      } catch {
        if (!cancelled) toast.error('Failed to load PayU settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);

  const save = async (form, unpublishCurrent = false) => {
    setSaving(true);
    try {
      const saved = await paymentsService.updatePayU({
        merchant_key: form.merchant_key?.trim() || '',
        merchant_salt: form.merchant_salt?.trim() || '',
        env: form.env || 'sandbox',
        unpublish_current: unpublishCurrent ? 1 : 0,
      });
      conflictState.clear();
      applySaved(saved, form);
      toast.success('PayU settings saved');
    } catch (err) {
      if (conflictState.openFromError(err, form, 'save')) return;
      toast.error(err.response?.data?.message || 'Failed to save PayU settings');
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (form) => save(form, false);

  const confirmConflict = async () => {
    if (!conflictState.conflict) return;
    conflictState.setBusy(true);
    try {
      if (conflictState.conflict.mode === 'publish') {
        setPublishing(true);
        await paymentsService.publish('payu', true);
        conflictState.clear();
        const data = await paymentsService.getPayU();
        applySaved(data);
        toast.success('PayU published on the website');
      } else {
        await save(conflictState.conflict.pendingPayload || getValues(), true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not continue');
    } finally {
      conflictState.setBusy(false);
      setPublishing(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await paymentsService.publish('payu', false);
      const data = await paymentsService.getPayU();
      applySaved(data);
      toast.success('PayU published on the website');
    } catch (err) {
      if (conflictState.openFromError(err, null, 'publish')) return;
      toast.error(err.response?.data?.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    try {
      await paymentsService.unpublish();
      const data = await paymentsService.getPayU();
      applySaved(data);
      toast.success('Payment gateway unpublished');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unpublish');
    } finally {
      setPublishing(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await paymentsService.testPayU();
      toast.success('PayU credentials verified with PayU sandbox/production API');
    } catch (err) {
      toast.error(err.response?.data?.message || 'PayU credential test failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  const c = conflictState.conflict;

  return (
    <div className="yulo-pay-detail">
      <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3 mb-3" onClick={onBack}>
        ← All gateways
      </button>

      <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <IconPayU />
            <h6 className="text-gold mb-0">PayU</h6>
          </div>
          <span className={`badge yulo-badge ${published ? 'yulo-badge--dark' : 'yulo-badge--light'}`}>
            {published ? 'Published · Hosted Checkout' : 'Hosted Checkout'}
          </span>
        </div>

        <p className="text-muted small mb-4">
          Add your PayU <strong>Merchant Key</strong> and <strong>Merchant Salt</strong> from{' '}
          <strong>Developers → API Keys → API Key Salt details</strong>. Do not use Client ID / Client Secret
          (those are for payment links). Use Sandbox for test keys, then publish to collect payments on the website.
        </p>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Merchant Key</label>
            <input
              className="form-control"
              placeholder="e.g. short key from API Key Salt details"
              autoComplete="off"
              {...register('merchant_key', { required: true })}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Merchant Salt</label>
            <input
              type="password"
              className="form-control"
              placeholder={saltSet ? '•••••••••••• (saved — enter new to replace)' : 'Salt from API Key Salt details'}
              autoComplete="new-password"
              {...register('merchant_salt')}
            />
            {saltSet ? (
              <div className="form-text">A merchant salt is already saved. Enter a new value only to replace it.</div>
            ) : (
              <div className="form-text">
                Required the first time. Copy <strong>Salt</strong> under API Key Salt details — not Client Secret.
              </div>
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label">Environment</label>
            <select className="form-select" {...register('env')}>
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </div>

          {callbackHint ? (
            <div className="col-12">
              <label className="form-label">PayU success / failure URL</label>
              <input className="form-control" value={callbackHint} readOnly />
              <div className="form-text">
                Used as <code>surl</code> / <code>furl</code>. PayU posts here; we verify and send the buyer to the
                storefront success page.
              </div>
            </div>
          ) : null}

          {returnHint ? (
            <div className="col-12">
              <label className="form-label">Customer return URL</label>
              <input className="form-control" value={returnHint} readOnly />
              <div className="form-text">Buyers land here after PayU checkout with View Order / Continue Shopping.</div>
            </div>
          ) : null}
        </div>

        <div className="d-flex flex-wrap gap-2 mt-4">
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? 'Saving...' : 'Save PayU Settings'}
          </button>
          <button
            type="button"
            className="btn btn-outline-dark"
            disabled={testing || saving || !saltSet}
            onClick={handleTest}
          >
            {testing ? 'Testing…' : 'Test connection'}
          </button>
        </div>

        <PublishBar
          gatewayId="payu"
          gatewayLabel="PayU"
          published={published}
          canPublish={canPublish}
          publishing={publishing}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
        />
      </form>

      <ConfirmModal
        show={Boolean(c)}
        title="Unpublish current gateway?"
        message={
          c
            ? `${c.publishedLabel} is currently published on the website. Unpublish it, then ${
                c.mode === 'publish' ? `publish ${c.requestedLabel}` : `configure ${c.requestedLabel}`
              }?`
            : ''
        }
        confirmLabel={c?.mode === 'publish' ? 'Unpublish & publish' : 'Unpublish & save'}
        cancelLabel="Cancel"
        variant="dark"
        confirmDisabled={conflictState.busy || saving || publishing}
        onConfirm={confirmConflict}
        onCancel={conflictState.clear}
      />
    </div>
  );
}

function UpcomingGatewayConfig({ gateway, onBack }) {
  const Icon = gateway.Icon;
  const defaults = useMemo(() => {
    const base = { env: 'sandbox', webhook_url: '' };
    (gateway.fields || []).forEach((f) => {
      base[f.key] = '';
    });
    return base;
  }, [gateway]);

  const { register, handleSubmit } = useForm({ defaultValues: defaults });

  const onSubmit = () => {
    toast.info(`${gateway.name} integration is coming soon. Credentials UI is ready for wiring.`);
  };

  return (
    <div className="yulo-pay-detail">
      <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3 mb-3" onClick={onBack}>
        ← All gateways
      </button>

      <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <Icon />
            <h6 className="text-gold mb-0">{gateway.name}</h6>
          </div>
          <span className="badge yulo-badge yulo-badge--light">Coming soon</span>
        </div>

        <p className="text-muted small mb-4">
          Enter {gateway.name} Client / Merchant credentials. Saving will be enabled when this gateway is wired to
          checkout.
        </p>

        <div className="row g-3">
          {(gateway.fields || []).map((field) => (
            <div className="col-md-6" key={field.key}>
              <label className="form-label">{field.label}</label>
              <input
                type={field.secret ? 'password' : 'text'}
                className="form-control"
                placeholder={field.placeholder}
                autoComplete={field.secret ? 'new-password' : 'off'}
                {...register(field.key)}
              />
            </div>
          ))}

          <div className="col-md-6">
            <label className="form-label">Environment</label>
            <select className="form-select" {...register('env')}>
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </div>

          <div className="col-12">
            <label className="form-label">Webhook URL</label>
            <input
              className="form-control"
              placeholder={`https://api.yourdomain.com/api/payments/${gateway.id}/webhook`}
              autoComplete="off"
              {...register('webhook_url')}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-gold mt-4">
          Save {gateway.name} Settings
        </button>
      </form>
    </div>
  );
}

function PaymentsContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [overview, setOverview] = useState(null);
  const selectedId = searchParams.get('gateway');
  const selected = GATEWAYS.find((g) => g.id === selectedId) || null;

  const loadOverview = async () => {
    try {
      const data = await paymentsService.getOverview();
      setOverview(data);
    } catch {
      // Overview is optional for cards; detail pages load their own settings.
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const openGateway = (id) => {
    setSearchParams({ gateway: id });
  };

  const closeGateway = () => {
    setSearchParams({});
    loadOverview();
  };

  return (
    <>
      <Helmet>
        <title>Payments — YULO Admin</title>
      </Helmet>
      <PageHeader
        title="Payments"
        subtitle={
          selected
            ? `Configure ${selected.name} credentials for checkout.`
            : overview?.published_gateway_label
              ? `Live on website: ${overview.published_gateway_label}. Choose a gateway to configure or publish.`
              : 'Choose a payment gateway, save credentials, then publish one gateway to collect payments on the website.'
        }
      />

      {!selected ? (
        <GatewayCards gateways={GATEWAYS} overview={overview} onSelect={openGateway} />
      ) : selected.id === 'razorpay' ? (
        <RazorpayConfig onBack={closeGateway} onStatusChange={loadOverview} />
      ) : selected.id === 'cashfree' ? (
        <CashfreeConfig onBack={closeGateway} onStatusChange={loadOverview} />
      ) : selected.id === 'phonepe' ? (
        <PhonePeConfig onBack={closeGateway} onStatusChange={loadOverview} />
      ) : selected.id === 'paytm' ? (
        <PaytmConfig onBack={closeGateway} onStatusChange={loadOverview} />
      ) : selected.id === 'payu' ? (
        <PayUConfig onBack={closeGateway} onStatusChange={loadOverview} />
      ) : (
        <UpcomingGatewayConfig gateway={selected} onBack={closeGateway} />
      )}
    </>
  );
}

export default function Payments() {
  return (
    <PagePasswordGate
      id="payments"
      password="Payments@1998"
      title="Payments locked"
      message="Enter the payments password to view and edit payment gateway credentials."
    >
      <PaymentsContent />
    </PagePasswordGate>
  );
}
