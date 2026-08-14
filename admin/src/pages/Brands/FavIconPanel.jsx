import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import faviconService from '../../services/faviconService';
import ImageUrlUploadField from '../../components/common/ImageUrlUploadField';
import ConfirmModal from '../../components/common/ConfirmModal';
import { resolveMediaUrl } from '../../utils/media';
import { ADMIN_FAVICON_EVENT } from '../../components/common/AdminFavicon';

export default function FavIconPanel() {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState({
    draft_url: null,
    published_url: null,
    is_published: false,
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: { favicon_url: '' },
  });
  const faviconUrl = watch('favicon_url');

  const applyPayload = (data) => {
    const draft = data?.draft_url || data?.url || null;
    const published = data?.published_url || null;
    setState({
      draft_url: draft,
      published_url: published,
      is_published: Boolean(data?.is_published),
    });
    reset({ favicon_url: draft || '' });
    setEditing(!draft);
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await faviconService.get();
      applyPayload(data);
    } catch {
      applyPayload({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async ({ favicon_url }) => {
    const trimmed = String(favicon_url || '').trim();
    if (!trimmed) {
      toast.error('Add a favicon URL or upload an image');
      return;
    }
    setSaving(true);
    try {
      const data = await faviconService.save(trimmed);
      applyPayload(data);
      setEditing(false);
      toast.success('Draft saved — click Publish to show it on the website');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save favicon');
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (file) => {
    const result = await faviconService.uploadImage(file);
    const path = result?.path || result?.url;
    if (!path) throw new Error('No path returned');
    applyPayload(result);
    setEditing(false);
    toast.success('Uploaded as draft — click Publish to go live');
    return path;
  };

  const onPublish = async () => {
    if (!state.draft_url) {
      toast.error('Add a favicon before publishing');
      return;
    }
    setPublishing(true);
    try {
      const data = await faviconService.publish();
      applyPayload(data);
      window.dispatchEvent(
        new CustomEvent(ADMIN_FAVICON_EVENT, {
          detail: { url: data?.published_url || data?.draft_url || null },
        })
      );
      toast.success('Favicon published on the website and admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const onDelete = async () => {
    setSaving(true);
    try {
      const data = await faviconService.remove();
      applyPayload(data);
      setEditing(true);
      setConfirmDelete(false);
      window.dispatchEvent(new CustomEvent(ADMIN_FAVICON_EVENT, { detail: { url: null } }));
      // Reload default after clear — AdminFavicon will restore logo.png on next full load;
      // force default logo when deleted:
      document
        .querySelectorAll("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']")
        .forEach((el) => el.remove());
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      link.href = '/logo.png';
      document.head.appendChild(link);
      toast.success('Favicon removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete favicon');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="yulo-card p-4 text-muted">Loading favicon…</div>;
  }

  const previewUrl = state.draft_url;
  const needsPublish = Boolean(state.draft_url) && !state.is_published;

  return (
    <>
      <div className="yulo-card p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h2 className="h6 text-uppercase mb-1">Site favicon</h2>
            <p className="text-muted small mb-0">
              Only one favicon is allowed. Save a draft, then publish it for the storefront and admin tab icons.
            </p>
          </div>
          {state.draft_url ? (
            <span className={`badge rounded-pill ${state.is_published ? 'text-bg-dark' : 'text-bg-secondary'}`}>
              {state.is_published ? 'Published' : 'Draft — not live'}
            </span>
          ) : null}
        </div>

        {previewUrl && !editing ? (
          <>
            <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
              <div
                className="border rounded d-flex align-items-center justify-content-center bg-light"
                style={{ width: 64, height: 64 }}
              >
                <img
                  src={resolveMediaUrl(previewUrl)}
                  alt="Favicon"
                  style={{ width: 32, height: 32, objectFit: 'contain' }}
                />
              </div>
              <div className="flex-grow-1" style={{ minWidth: 180 }}>
                <div className="small text-break">{previewUrl}</div>
                {state.published_url && state.published_url !== previewUrl ? (
                  <div className="small text-muted mt-1">
                    Live now: <span className="text-break">{state.published_url}</span>
                  </div>
                ) : null}
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-outline-dark btn-sm rounded-pill px-3"
                  onClick={() => {
                    reset({ favicon_url: previewUrl });
                    setEditing(true);
                  }}
                >
                  <i className="bi bi-pencil me-1" />
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm rounded-pill px-3"
                  onClick={() => setConfirmDelete(true)}
                >
                  <i className="bi bi-trash me-1" />
                  Delete
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-dark rounded-pill px-4"
              disabled={publishing || !needsPublish}
              onClick={onPublish}
            >
              {publishing ? 'Publishing…' : needsPublish ? 'Publish' : 'Published'}
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit(onSave)}>
            <ImageUrlUploadField
              label="Favicon URL"
              name="favicon_url"
              value={faviconUrl}
              register={register}
              setValue={setValue}
              uploadFn={onUpload}
              preview="logo"
              helpText="PNG or square image recommended (e.g. 32×32 or 64×64)."
            />
            <div className="d-flex gap-2 flex-wrap">
              <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={saving}>
                {saving ? 'Saving…' : state.draft_url ? 'Update draft' : 'Save draft'}
              </button>
              {state.draft_url ? (
                <button
                  type="button"
                  className="btn btn-outline-dark rounded-pill px-4"
                  onClick={() => {
                    reset({ favicon_url: state.draft_url });
                    setEditing(false);
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        )}
      </div>

      <ConfirmModal
        show={confirmDelete}
        title="Delete favicon"
        message="Remove the draft and published favicon? The browser tab will fall back to the default logo."
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
