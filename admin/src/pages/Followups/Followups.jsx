import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import Loader from '../../components/common/Loader';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import followupService from '../../services/followupService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'shared_response', label: 'Shared response' },
];

export default function Followups() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = { per_page: 50 };
      if (statusFilter) params.status = statusFilter;
      const { items: rows } = await followupService.list(params);
      setItems(rows || []);
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

  const openShare = (row) => {
    setSelected(row);
    setTrackingNumber(row.tracking_number || '');
    setCarrier(row.carrier || '');
    setAdminNotes(row.admin_notes || '');
    setNotifyCustomer(true);
  };

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
      toast.success('Tracking shared');
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

  return (
    <>
      <Helmet>
        <title>Followups — YULO Admin</title>
      </Helmet>
      <PageHeader
        title="Followups"
        subtitle="Customer tracking queries waiting for a response."
        actions={
          <select
            className="form-select form-select-sm"
            style={{ minWidth: 180 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        }
      />

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
    </>
  );
}
