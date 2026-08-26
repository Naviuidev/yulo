import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import Loader from '../../components/common/Loader';
import StatusBadge from '../../components/common/StatusBadge';
import reviewService from '../../services/reviewService';
import productService from '../../services/productService';

const TABS = [
  { id: 'received', label: 'Received Reviews', icon: 'bi-inbox' },
  { id: 'share', label: 'Share Page Link', icon: 'bi-link-45deg' },
  { id: 'static', label: 'Static Reviews', icon: 'bi-pencil-square' },
];

const STATUS_FILTERS = [
  { id: '', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

function resolveMediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080/api';
  const origin = apiUrl.replace(/\/api\/?$/, '');
  return `${origin}/${String(path).replace(/^\//, '')}`;
}

function getStorefrontOrigin() {
  const fromEnv = String(import.meta.env.VITE_STOREFRONT_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const apiUrl = String(import.meta.env.VITE_API_URL || '').trim();
  // https://api.yulowear.in/api → https://yulowear.in
  try {
    if (apiUrl) {
      const apiHost = new URL(apiUrl, window.location.origin).hostname;
      if (apiHost.startsWith('api.')) {
        return `${window.location.protocol}//${apiHost.slice(4)}`;
      }
    }
  } catch {
    /* ignore */
  }

  // https://admin.yulowear.in → https://yulowear.in
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.startsWith('admin.')) {
      return `${window.location.protocol}//${host.slice(6)}`;
    }
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5173';
    }
  }

  return 'http://localhost:5173';
}

function getWriteReviewUrl() {
  return `${getStorefrontOrigin()}/write-review`;
}

function ReceivedPanel({ status }) {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = { page: 1, per_page: 50 };
      if (status) params.status = status;
      const { items } = await reviewService.list(params);
      setReviews(items);
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [status]);

  const setReviewStatus = async (id, next) => {
    setBusyId(id);
    try {
      await reviewService.updateStatus(id, next);
      toast.success(
        next === 'approved'
          ? 'Review approved — live on website'
          : next === 'rejected'
            ? 'Review rejected'
            : 'Status updated'
      );
      fetchReviews();
    } catch {
      toast.error('Failed to update review');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loader />;

  if (!reviews.length) {
    return <div className="text-muted small py-4">No reviews in this filter.</div>;
  }

  return (
    <div className="yulo-review-admin__list">
      {reviews.map((r) => (
        <article key={r.id} className="yulo-review-admin__card">
          <div className="yulo-review-admin__card-top">
            <div className="d-flex align-items-center gap-2">
              {r.avatar_path ? (
                <img src={resolveMediaUrl(r.avatar_path)} alt="" className="yulo-review-admin__avatar" />
              ) : (
                <div className="yulo-review-admin__avatar yulo-review-admin__avatar--placeholder">
                  {(r.customer_name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="fw-semibold">{r.customer_name}</div>
                <div className="small text-muted">{r.customer_email}</div>
              </div>
            </div>
            <StatusBadge status={r.status} />
          </div>

          <div className="small text-muted mb-1">
            Product: <strong className="text-dark">{r.product_name}</strong>
          </div>
          <div className="mb-2">
            {Array.from({ length: 5 }, (_, i) => (
              <i key={i} className={`bi ${i < Number(r.rating) ? 'bi-star-fill' : 'bi-star'} me-1`} />
            ))}
            <span className="small text-muted">{Number(r.rating).toFixed(1)}</span>
          </div>
          <p className="mb-3">{r.comment}</p>

          <div className="d-flex flex-wrap gap-2">
            {r.status !== 'approved' ? (
              <button
                type="button"
                className="btn btn-sm btn-dark"
                disabled={busyId === r.id}
                onClick={() => setReviewStatus(r.id, 'approved')}
              >
                Approve
              </button>
            ) : null}
            {r.status !== 'rejected' ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                disabled={busyId === r.id}
                onClick={() => setReviewStatus(r.id, 'rejected')}
              >
                Reject
              </button>
            ) : null}
            {r.status !== 'pending' ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-dark"
                disabled={busyId === r.id}
                onClick={() => setReviewStatus(r.id, 'pending')}
              >
                Mark pending
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function SharePanel() {
  const url = useMemo(() => getWriteReviewUrl(), []);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Review page link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — select and copy manually');
    }
  };

  return (
    <div className="yulo-review-admin__share">
      <p className="text-muted mb-3">
        Share this link with customers so they can log in, pick a purchased product, and submit a review.
        New submissions appear under <strong>Received Reviews</strong> for approve / reject.
      </p>
      <label className="form-label small text-uppercase fw-medium">Customer review page</label>
      <div className="input-group mb-3">
        <input type="text" className="form-control" readOnly value={url} />
        <button type="button" className="btn btn-dark" onClick={copy}>
          <i className={`bi ${copied ? 'bi-check-lg' : 'bi-clipboard'} me-1`} />
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="btn btn-outline-dark btn-sm">
        Open page <i className="bi bi-box-arrow-up-right ms-1" />
      </a>
    </div>
  );
}

function StaticReviewsPanel() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productId, setProductId] = useState('');
  const [fullName, setFullName] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('approved');
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProducts(true);
      try {
        const { items } = await productService.list({ per_page: 200, page: 1 });
        if (!cancelled) setProducts(Array.isArray(items) ? items : []);
      } catch {
        if (!cancelled) {
          setProducts([]);
          toast.error('Could not load products');
        }
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resetForm = () => {
    setProductId('');
    setFullName('');
    setRating(5);
    setTitle('');
    setComment('');
    setStatus('approved');
    setAvatarFile(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!productId) {
      toast.error('Select a product');
      return;
    }
    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.error('Enter a display name');
      return;
    }
    if (!comment.trim()) {
      toast.error('Enter a review comment');
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      form.append('product_id', String(productId));
      form.append('full_name', fullName.trim());
      form.append('rating', String(rating));
      form.append('comment', comment.trim());
      form.append('status', status);
      if (title.trim()) form.append('title', title.trim());
      if (avatarFile) form.append('avatar', avatarFile);

      await reviewService.createStatic(form);
      toast.success(
        status === 'approved'
          ? 'Static review published'
          : 'Static review saved'
      );
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save review');
    } finally {
      setSaving(false);
    }
  };

  if (loadingProducts) return <Loader />;

  return (
    <div className="yulo-review-admin__static">
      <p className="text-muted mb-4">
        Dump reviews for any product without a customer purchase. Available when you are signed in
        with an admin / staff licence. Published reviews appear on the storefront and under{' '}
        <strong>Received Reviews</strong>.
      </p>

      <form onSubmit={onSubmit} className="yulo-review-admin__static-form border p-4">
        <div className="mb-3">
          <label className="form-label small text-uppercase fw-medium" htmlFor="static-product">
            Product
          </label>
          <select
            id="static-product"
            className="form-select"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
          >
            <option value="">Select product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {!products.length ? (
            <div className="form-text text-danger">No products found. Add products first.</div>
          ) : null}
        </div>

        <div className="row g-3">
          <div className="col-md-8">
            <label className="form-label small text-uppercase fw-medium" htmlFor="static-name">
              Customer display name
            </label>
            <input
              id="static-name"
              type="text"
              className="form-control"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Priya S."
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small text-uppercase fw-medium" htmlFor="static-rating">
              Rating
            </label>
            <select
              id="static-rating"
              className="form-select"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="form-label small text-uppercase fw-medium" htmlFor="static-title">
            Title <span className="text-muted normal-case">(optional)</span>
          </label>
          <input
            id="static-title"
            type="text"
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short headline"
          />
        </div>

        <div className="mt-3">
          <label className="form-label small text-uppercase fw-medium" htmlFor="static-comment">
            Review comment
          </label>
          <textarea
            id="static-comment"
            className="form-control"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write the review text…"
            required
          />
        </div>

        <div className="row g-3 mt-1">
          <div className="col-md-6">
            <label className="form-label small text-uppercase fw-medium" htmlFor="static-status">
              Status
            </label>
            <select
              id="static-status"
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="approved">Approved (live)</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label small text-uppercase fw-medium" htmlFor="static-avatar">
              Avatar <span className="text-muted normal-case">(optional)</span>
            </label>
            <input
              id="static-avatar"
              type="file"
              className="form-control"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 mt-4">
          <button type="submit" className="btn btn-dark" disabled={saving || !products.length}>
            {saving ? 'Saving…' : 'Add static review'}
          </button>
          <button type="button" className="btn btn-outline-dark" onClick={resetForm} disabled={saving}>
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Reviews() {
  const [tab, setTab] = useState('received');
  const [statusFilter, setStatusFilter] = useState('pending');

  return (
    <>
      <Helmet><title>Reviews — YULO Admin</title></Helmet>
      <PageHeader
        title="Reviews"
        subtitle="Moderate customer reviews, share the write-review page, or dump static reviews"
      />

      <div className="yulo-doc-cats">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`yulo-doc-cat ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <i className={`bi ${t.icon}`} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'received' ? (
        <>
          <div className="yulo-doc-cats mb-3">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id || 'all'}
                type="button"
                className={`yulo-doc-cat ${statusFilter === f.id ? 'is-active' : ''}`}
                onClick={() => setStatusFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <ReceivedPanel status={statusFilter} />
        </>
      ) : null}

      {tab === 'share' ? <SharePanel /> : null}
      {tab === 'static' ? <StaticReviewsPanel /> : null}
    </>
  );
}
