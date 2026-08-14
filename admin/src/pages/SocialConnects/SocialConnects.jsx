import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import Loader from '../../components/common/Loader';
import ConfirmModal from '../../components/common/ConfirmModal';
import whatsappService, { footerSocialService, instagramFeedService } from '../../services/whatsappService';
import productService from '../../services/productService';
import { resolveMediaUrl } from '../../utils/media';

const TABS = [
  { id: 'whatsapp', label: 'Configure WhatsApp', icon: 'bi-whatsapp' },
  { id: 'footer', label: 'Config Footer Social Connects', icon: 'bi-share' },
  { id: 'instagram', label: 'Config Insta Feed', icon: 'bi-instagram' },
];

const emptyWhatsApp = {
  enabled: false,
  number: '',
  position: 'bottom-left',
  prefill: 'Hi YULO, I have a question about your eyewear.',
};

const FALLBACK_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: 'bi-instagram' },
  { id: 'facebook', label: 'Facebook', icon: 'bi-facebook' },
  { id: 'youtube', label: 'YouTube', icon: 'bi-youtube' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'bi-linkedin' },
  { id: 'pinterest', label: 'Pinterest', icon: 'bi-pinterest' },
  { id: 'tiktok', label: 'TikTok', icon: 'bi-tiktok' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'bi-whatsapp' },
  { id: 'telegram', label: 'Telegram', icon: 'bi-telegram' },
];

function WhatsAppPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: emptyWhatsApp });
  const enabled = watch('enabled');
  const position = watch('position');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await whatsappService.get();
        if (cancelled) return;
        reset({
          enabled: Boolean(data?.enabled),
          number: data?.display_number || data?.number || '',
          position: data?.position === 'bottom-right' ? 'bottom-right' : 'bottom-left',
          prefill: data?.prefill || emptyWhatsApp.prefill,
        });
      } catch {
        if (!cancelled) toast.error('Failed to load WhatsApp settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reset]);

  const onSubmit = async (form) => {
    setSaving(true);
    try {
      const saved = await whatsappService.update({
        enabled: Boolean(form.enabled),
        number: form.number?.trim() || '',
        position: form.position || 'bottom-left',
        prefill: form.prefill?.trim() || '',
      });
      reset({
        enabled: Boolean(saved?.enabled),
        number: saved?.display_number || saved?.number || '',
        position: saved?.position === 'bottom-right' ? 'bottom-right' : 'bottom-left',
        prefill: saved?.prefill || '',
      });
      toast.success(saved?.enabled ? 'WhatsApp icon is on for the website' : 'WhatsApp icon turned off');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save WhatsApp settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card" style={{ maxWidth: 640 }}>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h6 className="mb-1">Show WhatsApp icon</h6>
          <p className="text-muted small mb-0">When off, the floating icon is hidden on the storefront.</p>
        </div>
        <div className="form-check form-switch m-0">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="whatsapp-enabled"
            {...register('enabled')}
          />
          <label className="form-check-label" htmlFor="whatsapp-enabled">
            {enabled ? 'On' : 'Off'}
          </label>
        </div>
      </div>

      {enabled ? (
        <>
          <div className="mb-3">
            <label className="form-label" htmlFor="whatsapp-number">WhatsApp number *</label>
            <input
              id="whatsapp-number"
              className="form-control"
              placeholder="+91 77990 56684"
              autoComplete="tel"
              {...register('number', { required: enabled })}
            />
            <div className="form-text">Include country code. Example: +91 77990 56684</div>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="whatsapp-position">Icon position</label>
            <select id="whatsapp-position" className="form-select" {...register('position')}>
              <option value="bottom-left">Bottom left</option>
              <option value="bottom-right">Bottom right</option>
            </select>
            <div className="form-text">
              Currently selected: <strong>{position === 'bottom-right' ? 'Bottom right' : 'Bottom left'}</strong>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="whatsapp-prefill">Opening message (optional)</label>
            <textarea
              id="whatsapp-prefill"
              className="form-control"
              rows={2}
              placeholder="Hi YULO…"
              {...register('prefill')}
            />
            <div className="form-text">Pre-filled text when a visitor opens the chat.</div>
          </div>
        </>
      ) : (
        <div className="alert alert-light border mb-0">
          Turn the switch <strong>On</strong> to enter the WhatsApp number and choose the icon position on the website.
        </div>
      )}

      <button type="submit" className="btn btn-gold mt-4" disabled={saving}>
        {saving ? 'Saving…' : 'Save WhatsApp settings'}
      </button>
    </form>
  );
}

function FooterSocialPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [platforms, setPlatforms] = useState(FALLBACK_PLATFORMS);
  const [showAdd, setShowAdd] = useState(false);
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(null);
  const [link, setLink] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await footerSocialService.get();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setPlatforms(Array.isArray(data?.platforms) && data.platforms.length ? data.platforms : FALLBACK_PLATFORMS);
    } catch {
      toast.error('Failed to load footer social connects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const usedPlatforms = useMemo(() => new Set(items.map((i) => i.platform)), [items]);

  const openAdd = () => {
    setStep(1);
    setSelected(null);
    setLink('');
    setShowAdd(true);
  };

  const closeAdd = () => {
    setShowAdd(false);
    setStep(1);
    setSelected(null);
    setLink('');
  };

  const persist = async (nextItems, successMsg) => {
    setSaving(true);
    try {
      const saved = await footerSocialService.update(nextItems);
      setItems(Array.isArray(saved?.items) ? saved.items : nextItems);
      toast.success(successMsg);
      closeAdd();
      setDeleteId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save social connects');
    } finally {
      setSaving(false);
    }
  };

  const submitAdd = async () => {
    if (!selected) {
      toast.error('Select a social account');
      return;
    }
    const url = link.trim();
    if (!url) {
      toast.error('Enter the profile link');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      toast.error('Enter a valid link starting with https://');
      return;
    }

    const next = [
      ...items,
      {
        id: `${selected.id}-${Date.now()}`,
        platform: selected.id,
        label: selected.label,
        icon: selected.icon,
        url,
      },
    ];
    await persist(next, `${selected.label} added to footer`);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const next = items.filter((i) => i.id !== deleteId);
    await persist(next, 'Social account removed');
  };

  if (loading) return <Loader />;

  return (
    <div className="yulo-form-card" style={{ maxWidth: 720 }}>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h6 className="mb-1">Footer social accounts</h6>
          <p className="text-muted small mb-0">These icons appear in the website footer.</p>
        </div>
        <button type="button" className="btn btn-dark btn-sm" onClick={openAdd}>
          <i className="bi bi-plus-lg me-1" /> Add social account
        </button>
      </div>

      {items.length ? (
        <div className="d-flex flex-column gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="d-flex align-items-center justify-content-between gap-3 border rounded px-3 py-2"
            >
              <div className="d-flex align-items-center gap-3 min-w-0">
                <span className="yulo-social-pick__icon" aria-hidden="true">
                  <i className={`bi ${item.icon} fs-4`} />
                </span>
                <div className="min-w-0">
                  <div className="fw-medium">{item.label}</div>
                  <a href={item.url} target="_blank" rel="noreferrer" className="small text-muted text-truncate d-block">
                    {item.url}
                  </a>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => setDeleteId(item.id)}
                aria-label={`Remove ${item.label}`}
              >
                <i className="bi bi-trash" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="alert alert-light border mb-0">
          No footer social accounts yet. Click <strong>Add social account</strong> to add Instagram, Facebook, and more.
        </div>
      )}

      {showAdd ? (
        <>
          <div className="modal-backdrop fade show yulo-confirm-backdrop" onClick={closeAdd} />
          <div className="modal fade show d-block yulo-confirm-modal" tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content yulo-modal">
                <div className="modal-header border-0">
                  <h5 className="modal-title">
                    {step === 1 ? 'Choose social account' : `Add ${selected?.label || 'account'}`}
                  </h5>
                  <button type="button" className="btn-close" onClick={closeAdd} aria-label="Close" />
                </div>
                <div className="modal-body">
                  {step === 1 ? (
                    <div className="yulo-social-pick">
                      {platforms.map((p) => {
                        const used = usedPlatforms.has(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className={`yulo-social-pick__btn ${selected?.id === p.id ? 'is-selected' : ''}`}
                            disabled={used}
                            title={used ? 'Already added' : p.label}
                            onClick={() => {
                              setSelected(p);
                              setStep(2);
                              setLink('');
                            }}
                          >
                            <i className={`bi ${p.icon}`} />
                            <span>{p.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <span className="yulo-social-pick__icon">
                          <i className={`bi ${selected?.icon} fs-3`} />
                        </span>
                        <strong>{selected?.label}</strong>
                      </div>
                      <label className="form-label" htmlFor="social-link">Profile / page link *</label>
                      <input
                        id="social-link"
                        type="url"
                        className="form-control"
                        placeholder="https://…"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        autoFocus
                      />
                      <div className="form-text">Paste the full URL visitors should open.</div>
                    </>
                  )}
                </div>
                <div className="modal-footer border-0">
                  {step === 2 ? (
                    <button type="button" className="btn btn-light" onClick={() => setStep(1)}>
                      Back
                    </button>
                  ) : (
                    <button type="button" className="btn btn-light" onClick={closeAdd}>
                      Cancel
                    </button>
                  )}
                  {step === 2 ? (
                    <button
                      type="button"
                      className="btn btn-dark"
                      onClick={submitAdd}
                      disabled={saving || !link.trim()}
                    >
                      {saving ? 'Saving…' : 'Submit'}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <ConfirmModal
        show={!!deleteId}
        title="Remove social account"
        message="Remove this account from the website footer?"
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        confirmDisabled={saving}
      />
    </div>
  );
}

function emptyInstaForm() {
  return {
    enabled: true,
    handle: 'yulofashion',
    profile_url: 'https://www.instagram.com/yulofashion/',
    ig_user_id: '',
    app_id: '',
    access_token: '',
    feed_source: 'manual',
    max_posts: 6,
  };
}

function InstaFeedPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [tokenSet, setTokenSet] = useState(false);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [lastSyncError, setLastSyncError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({
    image_url: '',
    permalink: '',
    caption: '',
    product_id: '',
  });
  const { register, handleSubmit, reset, watch, getValues } = useForm({ defaultValues: emptyInstaForm() });
  const enabled = watch('enabled');
  const feedSource = watch('feed_source');

  const applySaved = (data) => {
    reset({
      enabled: Boolean(data?.enabled),
      handle: data?.handle || 'yulofashion',
      profile_url: data?.profile_url || '',
      ig_user_id: data?.ig_user_id || '',
      app_id: data?.app_id || '',
      access_token: data?.access_token || '',
      feed_source: data?.feed_source === 'api' ? 'api' : 'manual',
      max_posts: Number(data?.max_posts) || 6,
    });
    setTokenSet(Boolean(data?.token_set));
    setItems(Array.isArray(data?.items) ? data.items : []);
    setLastSyncedAt(data?.last_synced_at || null);
    setLastSyncError(data?.last_sync_error || data?.sync_error || null);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [data, productRes] = await Promise.all([
          instagramFeedService.get(),
          productService.list({ per_page: 100 }),
        ]);
        if (cancelled) return;
        applySaved(data);
        setProducts(productRes?.items || []);
      } catch {
        if (!cancelled) toast.error('Failed to load Instagram feed settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reset]);

  const onSave = async (form) => {
    setSaving(true);
    try {
      const saved = await instagramFeedService.update({
        ...form,
        enabled: Boolean(form.enabled),
        max_posts: Number(form.max_posts) || 6,
        items: form.feed_source === 'api' ? undefined : items,
      });
      applySaved(saved);
      if (saved?.sync_error || saved?.last_sync_error) {
        toast.warning(saved.sync_error || saved.last_sync_error);
      } else if (form.feed_source === 'api' && (saved?.items?.length || 0) > 0) {
        toast.success(`Saved & synced ${saved.items.length} Instagram posts`);
      } else {
        toast.success('Instagram feed settings saved');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save Instagram feed');
    } finally {
      setSaving(false);
    }
  };

  const onSync = async () => {
    setSyncing(true);
    try {
      const form = getValues();
      const saved = await instagramFeedService.sync({
        ...form,
        enabled: Boolean(form.enabled),
        max_posts: Number(form.max_posts) || 6,
        feed_source: 'api',
      });
      applySaved({ ...saved, feed_source: 'api' });
      toast.success(`Synced ${saved?.items?.length || 0} posts from Instagram`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Instagram sync failed';
      setLastSyncError(msg);
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  };

  const addItem = () => {
    const image = draft.image_url.trim();
    if (!image) {
      toast.error('Image URL is required');
      return;
    }
    const product = products.find((p) => String(p.id) === String(draft.product_id));
    setItems((prev) => [
      ...prev,
      {
        id: `ig-${Date.now()}`,
        image_url: image,
        permalink: draft.permalink.trim(),
        caption: draft.caption.trim(),
        product_id: product ? product.id : null,
        product_name: product?.name || '',
        product_slug: product?.slug || '',
        source: 'manual',
      },
    ]);
    setDraft({ image_url: '', permalink: '', caption: '', product_id: '' });
    setShowAdd(false);
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (loading) return <Loader />;

  return (
    <form onSubmit={handleSubmit(onSave)} className="yulo-insta-admin">
      <div className="form-check form-switch mb-3">
        <input className="form-check-input" type="checkbox" id="insta-enabled" {...register('enabled')} />
        <label className="form-check-label" htmlFor="insta-enabled">
          Show @feed section on homepage
        </label>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <label className="form-label" htmlFor="insta-handle">Instagram handle</label>
          <div className="input-group">
            <span className="input-group-text">@</span>
            <input id="insta-handle" className="form-control" placeholder="yulofashion" {...register('handle')} />
          </div>
        </div>
        <div className="col-md-8">
          <label className="form-label" htmlFor="insta-profile">Profile URL</label>
          <input
            id="insta-profile"
            className="form-control"
            placeholder="https://www.instagram.com/yulofashion/"
            {...register('profile_url')}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="insta-max">Max posts on website</label>
          <input
            id="insta-max"
            type="number"
            min={1}
            max={24}
            className="form-control"
            {...register('max_posts')}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="insta-source">Feed source</label>
          <select id="insta-source" className="form-select" {...register('feed_source')}>
            <option value="manual">Manual posts</option>
            <option value="api">Instagram API</option>
          </select>
        </div>
      </div>

      <div className="yulo-insta-admin__creds mb-4">
        <h6 className="mb-2">Instagram account API</h6>
        <p className="small text-muted mb-3">
          Used to fetch posts for the homepage @{watch('handle') || 'yulowear.in'} section.
          {tokenSet ? ' Access token is saved.' : ''}
        </p>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label" htmlFor="insta-app">App ID</label>
            <input id="insta-app" className="form-control" placeholder="Meta App ID" {...register('app_id')} />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="insta-user">Instagram User ID</label>
            <input id="insta-user" className="form-control" placeholder="IG Business User ID" {...register('ig_user_id')} />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="insta-token">Access token</label>
            <input
              id="insta-token"
              className="form-control"
              placeholder={tokenSet ? '•••••••••••• (leave blank to keep)' : 'Long-lived access token'}
              {...register('access_token')}
            />
          </div>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
          <button
            type="button"
            className="btn btn-dark btn-sm"
            disabled={syncing || saving}
            onClick={onSync}
          >
            {syncing ? 'Syncing…' : 'Sync posts from Instagram'}
          </button>
          {lastSyncedAt ? (
            <span className="small text-muted">Last synced: {new Date(lastSyncedAt).toLocaleString()}</span>
          ) : null}
        </div>
        {lastSyncError ? (
          <div className="alert alert-danger mt-3 mb-0 small">{lastSyncError}</div>
        ) : feedSource === 'api' ? (
          <div className="alert alert-secondary mt-3 mb-0 small">
            Click <strong>Sync posts from Instagram</strong> (or Save) to pull media into the homepage feed.
          </div>
        ) : null}
      </div>

      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h6 className="mb-0">{feedSource === 'api' ? 'Synced / feed posts' : 'Manual feed posts'}</h6>
          <div className="small text-muted">
            {items.length} post{items.length === 1 ? '' : 's'} will show under @{watch('handle') || 'yulowear.in'}
          </div>
        </div>
        {feedSource === 'manual' ? (
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => setShowAdd(true)}>
            <i className="bi bi-plus-lg me-1" />
            Add post
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="text-muted small mb-4">
          No posts yet. {feedSource === 'api' ? 'Sync from Instagram to populate the section.' : 'Add image URLs to populate the section.'}
        </div>
      ) : (
        <div className="yulo-insta-admin__grid mb-4">
          {items.map((item) => (
            <div key={item.id} className="yulo-insta-admin__card">
              <img src={resolveMediaUrl(item.image_url)} alt="" />
              <div className="yulo-insta-admin__card-body">
                <div className="small text-truncate">{item.caption || item.product_name || 'Instagram post'}</div>
                {item.product_name ? <div className="small text-muted">Product: {item.product_name}</div> : null}
                {feedSource === 'manual' ? (
                  <button type="button" className="btn btn-sm btn-outline-danger mt-2" onClick={() => removeItem(item.id)}>
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="submit" className="btn btn-dark" disabled={saving || syncing}>
        {saving ? 'Saving…' : 'Save Instagram feed'}
      </button>

      {showAdd ? (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add Instagram post</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAdd(false)} aria-label="Close" />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Image URL *</label>
                    <input
                      className="form-control"
                      value={draft.image_url}
                      onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))}
                      placeholder="https://… or uploads/…"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Instagram post link (optional)</label>
                    <input
                      className="form-control"
                      value={draft.permalink}
                      onChange={(e) => setDraft((d) => ({ ...d, permalink: e.target.value }))}
                      placeholder="https://www.instagram.com/p/…"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Caption (optional)</label>
                    <input
                      className="form-control"
                      value={draft.caption}
                      onChange={(e) => setDraft((d) => ({ ...d, caption: e.target.value }))}
                    />
                  </div>
                  <div className="mb-0">
                    <label className="form-label">Link to product (optional)</label>
                    <select
                      className="form-select"
                      value={draft.product_id}
                      onChange={(e) => setDraft((d) => ({ ...d, product_id: e.target.value }))}
                    >
                      <option value="">None</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-dark" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="button" className="btn btn-dark" onClick={addItem}>Add post</button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </form>
  );
}

export default function SocialConnects() {
  const [tab, setTab] = useState('whatsapp');

  return (
    <>
      <Helmet>
        <title>Configure Social Connects — YULO Admin</title>
      </Helmet>
      <PageHeader
        title="Configure Social Connects"
        subtitle="Manage WhatsApp, footer socials, and the homepage Instagram feed."
      />

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

      {tab === 'whatsapp' ? <WhatsAppPanel /> : null}
      {tab === 'footer' ? <FooterSocialPanel /> : null}
      {tab === 'instagram' ? <InstaFeedPanel /> : null}
    </>
  );
}
