import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import Loader from '../../components/common/Loader';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import followupService, { contactMessageService } from '../../services/followupService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const TABS = [
  { id: 'followups', label: 'Followups', icon: 'bi-chat-left-text' },
  { id: 'contact', label: 'Contact Us Form', icon: 'bi-envelope' },
];

const FOLLOWUP_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'shared_response', label: 'Shared response' },
];

const CONTACT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
];

function FollowupsPanel({ highlightId, clearHighlight }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openShare = (row) => {
    setSelected(row);
    setTrackingNumber(row.tracking_number || '');
    setCarrier(row.carrier || '');
    setAdminNotes(row.admin_notes || '');
    setNotifyCustomer(true);
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = { per_page: 50 };
      if (statusFilter) params.status = statusFilter;
      const { items: rows } = await followupService.list(params);
      setItems(rows || []);

      if (highlightId) {
        const match = (rows || []).find((r) => String(r.id) === String(highlightId));
        if (match) openShare(match);
        clearHighlight?.();
      }
    } catch {
      setItems([]);
      toast.error('Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const closeShare = () => {
    if (saving) return;
    setSelected(null);
  };

  const confirmShare = async () => {
    if (!selected) return;
    if (!trackingNumber.trim()) {
      toast.error('Enter a tracking number');
      return;
    }
    setSaving(true);
    try {
      const result = await followupService.shareResponse(selected.id, {
        tracking_number: trackingNumber.trim(),
        carrier: carrier.trim() || undefined,
        admin_notes: adminNotes.trim() || undefined,
        notify_customer: notifyCustomer,
      });
      toast.success('Tracking shared — follow-up kept in list');
      if (notifyCustomer) {
        if (result?.email_sent) {
          toast.success(result.email_message || 'Customer emailed');
        } else {
          toast.info(result?.email_message || 'Saved, but email was not sent');
        }
      }
      setSelected(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to share tracking');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await followupService.remove(deleteId);
      toast.success('Follow-up deleted');
      setDeleteId(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="d-flex justify-content-end mb-3">
        <select
          className="form-select form-select-sm"
          style={{ minWidth: 180 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {FOLLOWUP_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loader />
      ) : items.length === 0 ? (
        <div className="yulo-empty">No follow-ups found for this filter.</div>
      ) : (
        <div className="yulo-card">
          <div className="table-responsive">
            <table className="table yulo-table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Subject</th>
                  <th>Raised</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="fw-medium">#{row.order_number}</div>
                      <div className="small text-muted text-capitalize">{row.order_status}</div>
                      <div className="small text-muted">{formatCurrency(row.order_total)}</div>
                    </td>
                    <td>
                      <div>{row.customer_name || '—'}</div>
                      <div className="small text-muted">{row.customer_email || '—'}</div>
                      {row.customer_phone ? (
                        <div className="small text-muted">{row.customer_phone}</div>
                      ) : null}
                    </td>
                    <td>
                      <div className="fw-medium">{row.subject}</div>
                      <div className="small text-muted text-truncate" style={{ maxWidth: 280 }}>
                        {row.message}
                      </div>
                    </td>
                    <td className="small text-muted">{formatDateTime(row.created_at)}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        {row.status === 'pending' ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-dark"
                            onClick={() => openShare(row)}
                          >
                            Share response
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-light"
                            onClick={() => openShare(row)}
                          >
                            View / update
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          title="Delete follow-up"
                          onClick={() => setDeleteId(row.id)}
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        show={!!selected}
        title="Share tracking response"
        message={
          selected
            ? `Share tracking for order #${selected.order_number} with ${selected.customer_email || 'customer'}.`
            : ''
        }
        confirmLabel={saving ? 'Sharing…' : 'Share tracking'}
        cancelLabel="Cancel"
        variant="dark"
        confirmDisabled={saving || !trackingNumber.trim()}
        onConfirm={confirmShare}
        onCancel={closeShare}
      >
        {selected ? (
          <div className="mt-3 pt-3 border-top">
            <div className="small text-muted mb-3">
              <div>
                <strong>Customer:</strong> {selected.customer_name || '—'}
              </div>
              <div>
                <strong>Email:</strong> {selected.customer_email || '—'}
              </div>
              <div>
                <strong>Query:</strong> {selected.message}
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="fu-tracking">
                Tracking number
              </label>
              <input
                id="fu-tracking"
                className="form-control"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                disabled={saving}
                placeholder="AWB / tracking ID"
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="fu-carrier">
                Carrier (optional)
              </label>
              <input
                id="fu-carrier"
                className="form-control"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                disabled={saving}
                placeholder="Delhivery, BlueDart…"
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="fu-notes">
                Admin notes (optional)
              </label>
              <textarea
                id="fu-notes"
                className="form-control"
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="fu-notify"
                checked={notifyCustomer}
                onChange={(e) => setNotifyCustomer(e.target.checked)}
                disabled={saving || !selected.customer_email}
              />
              <label className="form-check-label" htmlFor="fu-notify">
                Email tracking link to the customer
              </label>
            </div>
          </div>
        ) : null}
      </ConfirmModal>

      <ConfirmModal
        show={!!deleteId}
        title="Delete follow-up"
        message="Permanently delete this follow-up? This cannot be undone."
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        variant="danger"
        confirmDisabled={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setDeleteId(null)}
      />
    </>
  );
}

function ContactPanel() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = { per_page: 50 };
      if (statusFilter) params.status = statusFilter;
      const { items: rows } = await contactMessageService.list(params);
      setItems(rows || []);
    } catch {
      setItems([]);
      toast.error('Failed to load contact messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const setStatus = async (id, status) => {
    setBusyId(id);
    try {
      await contactMessageService.updateStatus(id, status);
      toast.success('Status updated');
      await load();
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, status } : prev));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  const openMessage = async (row) => {
    setSelected(row);
    if (row.status === 'new') {
      try {
        await contactMessageService.updateStatus(row.id, 'read');
        setSelected({ ...row, status: 'read' });
        setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: 'read' } : r)));
      } catch {
        // ignore auto-read failure
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await contactMessageService.remove(deleteId);
      toast.success('Message deleted');
      if (selected?.id === deleteId) setSelected(null);
      setDeleteId(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="d-flex justify-content-end mb-3">
        <select
          className="form-select form-select-sm"
          style={{ minWidth: 180 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {CONTACT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loader />
      ) : items.length === 0 ? (
        <div className="yulo-empty">No contact messages found for this filter.</div>
      ) : (
        <div className="yulo-card">
          <div className="table-responsive">
            <table className="table yulo-table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Subject</th>
                  <th>Received</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="fw-medium">{row.name}</div>
                      <div className="small text-muted">{row.email}</div>
                      {row.phone ? <div className="small text-muted">{row.phone}</div> : null}
                    </td>
                    <td>
                      <div className="fw-medium">{row.subject}</div>
                      <div className="small text-muted text-truncate" style={{ maxWidth: 320 }}>
                        {row.message}
                      </div>
                    </td>
                    <td className="small text-muted">{formatDateTime(row.created_at)}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-dark"
                          onClick={() => openMessage(row)}
                        >
                          View
                        </button>
                        {row.status !== 'replied' ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-dark"
                            disabled={busyId === row.id}
                            onClick={() => setStatus(row.id, 'replied')}
                          >
                            Mark replied
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          title="Delete message"
                          onClick={() => setDeleteId(row.id)}
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        show={!!selected}
        title="Contact message"
        message={selected ? `${selected.subject}` : ''}
        confirmLabel="Close"
        cancelLabel=""
        variant="dark"
        onConfirm={() => setSelected(null)}
        onCancel={() => setSelected(null)}
      >
        {selected ? (
          <div className="mt-3 pt-3 border-top small">
            <div className="mb-2">
              <strong>From:</strong> {selected.name} ({selected.email})
            </div>
            {selected.phone ? (
              <div className="mb-2">
                <strong>Phone:</strong> {selected.phone}
              </div>
            ) : null}
            <div className="mb-2">
              <strong>Status:</strong> <StatusBadge status={selected.status} />
            </div>
            <div className="mb-2">
              <strong>Received:</strong> {formatDateTime(selected.created_at)}
            </div>
            <div className="mt-3 p-3 border bg-light" style={{ whiteSpace: 'pre-wrap' }}>
              {selected.message}
            </div>
            <div className="d-flex flex-wrap gap-2 mt-3">
              {selected.status !== 'replied' ? (
                <button
                  type="button"
                  className="btn btn-sm btn-dark"
                  onClick={() => setStatus(selected.id, 'replied')}
                >
                  Mark replied
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => {
                  setDeleteId(selected.id);
                }}
              >
                <i className="bi bi-trash me-1" />
                Delete
              </button>
            </div>
          </div>
        ) : null}
      </ConfirmModal>

      <ConfirmModal
        show={!!deleteId}
        title="Delete contact message"
        message="Permanently delete this contact message? This cannot be undone."
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        variant="danger"
        confirmDisabled={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setDeleteId(null)}
      />
    </>
  );
}

export default function Followups() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('id');
  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState(tabParam === 'contact' ? 'contact' : 'followups');

  const setTabAndUrl = (next) => {
    setTab(next);
    const nextParams = new URLSearchParams(searchParams);
    if (next === 'contact') nextParams.set('tab', 'contact');
    else nextParams.delete('tab');
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>Followups — YULO Admin</title>
      </Helmet>
      <PageHeader
        title="Followups"
        subtitle="Tracking follow-ups and Contact Us form messages."
      />

      <div className="yulo-doc-cats mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`yulo-doc-cat ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTabAndUrl(t.id)}
          >
            <i className={`bi ${t.icon}`} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'followups' ? (
        <FollowupsPanel
          highlightId={highlightId}
          clearHighlight={() => {
            const next = new URLSearchParams(searchParams);
            next.delete('id');
            setSearchParams(next, { replace: true });
          }}
        />
      ) : (
        <ContactPanel />
      )}
    </>
  );
}
