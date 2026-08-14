import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import Loader from '../../components/common/Loader';
import StatusBadge from '../../components/common/StatusBadge';
import reviewService from '../../services/reviewService';

const TABS = [
  { id: 'received', label: 'Received Reviews', icon: 'bi-inbox' },
  { id: 'share', label: 'Share Page Link', icon: 'bi-link-45deg' },
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

function getWriteReviewUrl() {
  const fromEnv = (import.meta.env.VITE_STOREFRONT_URL || '').replace(/\/$/, '');
  if (fromEnv) return `${fromEnv}/write-review`;
  return 'http://localhost:5173/write-review';
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

export default function Reviews() {
  const [tab, setTab] = useState('received');
  const [statusFilter, setStatusFilter] = useState('pending');

  return (
    <>
      <Helmet><title>Reviews — YULO Admin</title></Helmet>
      <PageHeader
        title="Reviews"
        subtitle="Moderate customer reviews and share the write-review page"
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
      ) : (
        <SharePanel />
      )}
    </>
  );
}
