import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import Loader from '../../components/common/Loader';
import notificationService from '../../services/notificationService';
import { formatDateTime } from '../../utils/formatters';

const iconMap = {
  order: 'bi-bag-check',
  stock: 'bi-exclamation-triangle',
  customer: 'bi-person-plus',
  followup: 'bi-chat-left-text',
  contact: 'bi-envelope',
  payment: 'bi-credit-card',
  delivery: 'bi-truck',
};

const typeFilters = [
  { value: 'all', label: 'All' },
  { value: 'order', label: 'Orders' },
  { value: 'followup', label: 'Followups' },
  { value: 'stock', label: 'Stock' },
  { value: 'customer', label: 'Customers' },
];

function relativeTime(dateStr) {
  if (!dateStr) return '—';
  const ts = new Date(dateStr).getTime();
  if (Number.isNaN(ts)) return formatDateTime(dateStr);
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDateTime(dateStr);
}

const Notifications = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.list();
      setItems(data?.items || []);
      setUnreadCount(Number(data?.unread_count || 0));
    } catch {
      setItems([]);
      setUnreadCount(0);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((n) => n.type === filter);
  }, [items, filter]);

  const openNotification = async (n) => {
    if (!n?.read && n?.key) {
      try {
        await notificationService.markRead(n.key);
        setItems((prev) => prev.map((row) => (row.key === n.key ? { ...row, read: true } : row)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // still navigate
      }
    }
    if (n?.link) {
      navigate(n.link);
    }
  };

  const markAll = async () => {
    setMarking(true);
    try {
      await notificationService.markAllRead();
      setItems((prev) => prev.map((row) => ({ ...row, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    } finally {
      setMarking(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <>
      <Helmet><title>Notifications — YULO Admin</title></Helmet>
      <PageHeader
        title="Notifications"
        subtitle="Live store activity — click any item to open it"
        actions={
          <div className="d-flex gap-2 flex-wrap">
            <button type="button" className="btn btn-outline-dark btn-sm" onClick={load}>
              <i className="bi bi-arrow-clockwise me-1" /> Refresh
            </button>
            <button
              type="button"
              className="btn btn-dark btn-sm"
              onClick={markAll}
              disabled={marking || unreadCount === 0}
            >
              Mark all read{unreadCount ? ` (${unreadCount})` : ''}
            </button>
          </div>
        }
      />

      <div className="d-flex flex-wrap gap-2 mb-3">
        {typeFilters.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`btn btn-sm ${filter === f.value ? 'btn-dark' : 'btn-outline-dark'}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="yulo-card">
        <div className="yulo-card-body p-0">
          {filtered.length ? (
            filtered.map((n) => (
              <button
                type="button"
                key={n.key || n.id}
                className={`yulo-alert-item yulo-alert-item--clickable w-100 text-start border-0 ${!n.read ? 'bg-light' : ''}`}
                onClick={() => openNotification(n)}
              >
                <div className="yulo-alert-item__icon" style={{ background: 'rgba(0,0,0,0.08)', color: '#111' }}>
                  <i className={`bi ${iconMap[n.type] || 'bi-bell'}`} />
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between gap-2">
                    <strong className="small">{n.title}</strong>
                    <span className="small text-muted text-nowrap">{relativeTime(n.created_at)}</span>
                  </div>
                  <p className="mb-0 small text-muted">{n.message}</p>
                </div>
                {!n.read && <span className="badge yulo-badge yulo-badge--dark">New</span>}
                <i className="bi bi-chevron-right text-muted" />
              </button>
            ))
          ) : (
            <div className="yulo-empty py-5">
              <i className="bi bi-bell display-4 d-block mb-3 opacity-25" />
              <h5>No notifications</h5>
              <p className="text-muted mb-0">New orders, customers, stock alerts and follow-ups will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Notifications;
