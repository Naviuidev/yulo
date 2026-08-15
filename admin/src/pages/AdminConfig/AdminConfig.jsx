import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import ConfirmModal from '../../components/common/ConfirmModal';
import staffLicenceService from '../../services/staffLicenceService';
import { isMasterAdmin } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';

const TABS = [
  { id: 'provide', label: 'Provide Licence', icon: 'bi-person-plus' },
  { id: 'licences', label: 'Licences', icon: 'bi-person-badge' },
];

const STEPS = [
  { id: 1, label: 'Staff email' },
  { id: 2, label: 'Verify OTP' },
  { id: 3, label: 'Select features' },
  { id: 4, label: 'Share access' },
];

const FEATURE_LABELS = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  customers: 'Customers',
  products: 'Products',
  categories: 'Categories',
  brands: 'Brands & Sections',
  inventory: 'Inventory',
  deliveries: 'Deliveries',
  followups: 'Followups',
  'offer-strips': 'Offers',
  faqs: 'FAQs',
  reviews: 'Reviews',
  notifications: 'Notifications',
  visitors: 'Visitors',
  payments: 'Payments',
  'social-connects': 'Social Connects',
  doc: 'Doc',
};

const STATUS_LABELS = {
  awaiting_dev_otp: 'Awaiting OTP',
  features_pending: 'Features pending',
  invite_sent: 'Invite sent',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  banned: 'Banned',
  cancelled: 'Cancelled',
};

const FEATURE_OPTIONS = Object.entries(FEATURE_LABELS).map(([key, label]) => ({ key, label }));

function formatFeatures(keys = []) {
  return keys.map((k) => FEATURE_LABELS[k] || k).join(', ') || '—';
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function ProvideLicencePanel() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [licenceId, setLicenceId] = useState(null);
  const [devMasked, setDevMasked] = useState('');
  const [features, setFeatures] = useState([]);
  const [selected, setSelected] = useState([]);
  const [invite, setInvite] = useState(null);
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleFeature = (key) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const resetWizard = () => {
    setStep(1);
    setEmail('');
    setName('');
    setOtp('');
    setLicenceId(null);
    setDevMasked('');
    setSelected([]);
    setInvite(null);
    setEmailSent(false);
  };

  const onProcess = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await staffLicenceService.start({ email, name: name || undefined });
      setLicenceId(data.licence_id);
      setDevMasked(data.dev_email_masked || '');
      setStep(2);
      toast.success('OTP sent to developer email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start licence');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await staffLicenceService.verifyDevOtp(licenceId, otp);
      setFeatures(data.features || []);
      setSelected([]);
      setStep(3);
      toast.success('OTP verified');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const onAssignFeatures = async (e) => {
    e.preventDefault();
    if (!selected.length) {
      toast.error('Select at least one feature');
      return;
    }
    setLoading(true);
    try {
      const data = await staffLicenceService.assignFeatures(licenceId, selected);
      setInvite(data);
      setEmailSent(false);
      setStep(4);
      toast.success('Invite ready — click Processed Licence to email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not generate invite');
    } finally {
      setLoading(false);
    }
  };

  const onProcessedLicence = async () => {
    if (!invite?.licence_id || !invite?.temp_password) return;
    setLoading(true);
    try {
      await staffLicenceService.sendInvite(invite.licence_id, invite.temp_password);
      setEmailSent(true);
      toast.success('Invite emailed to staff');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send invite email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="yulo-card p-4">
      <nav className="yulo-licence-steps mb-4" aria-label="Licence steps">
        {STEPS.map((s) => (
          <span
            key={s.id}
            className={`yulo-licence-step ${step === s.id ? 'is-active' : ''} ${step > s.id ? 'is-done' : ''}`}
          >
            <em>{s.id}</em>
            {s.label}
          </span>
        ))}
      </nav>

      {step === 1 && (
        <form onSubmit={onProcess} className="yulo-licence-form">
          <p className="text-muted small mb-3">
            Enter the staff member email. An OTP will be sent to the developer inbox to continue.
          </p>
          <div className="mb-3">
            <label className="form-label small text-uppercase fw-medium">Staff email</label>
            <input
              type="email"
              className="form-control"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@example.com"
            />
          </div>
          <div className="mb-4">
            <label className="form-label small text-uppercase fw-medium">Name (optional)</label>
            <input
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Staff display name"
            />
          </div>
          <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={loading}>
            {loading ? 'Processing…' : 'Process'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={onVerifyOtp} className="yulo-licence-form">
          <p className="text-muted small mb-3">
            Enter the OTP sent to the developer email{devMasked ? ` (${devMasked})` : ''}.
          </p>
          <div className="mb-4">
            <label className="form-label small text-uppercase fw-medium">OTP</label>
            <input
              type="text"
              className="form-control"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
            />
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-outline-dark rounded-pill px-4" onClick={() => setStep(1)}>
              Back
            </button>
            <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={loading || otp.length !== 6}>
              {loading ? 'Verifying…' : 'Verify OTP'}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={onAssignFeatures} className="yulo-licence-form">
          <p className="text-muted small mb-3">Select the admin features this member can access.</p>
          <div className="yulo-licence-features mb-4">
            {features.map((f) => (
              <label key={f.key} className={`yulo-licence-feature ${selected.includes(f.key) ? 'is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={selected.includes(f.key)}
                  onChange={() => toggleFeature(f.key)}
                />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-outline-dark rounded-pill px-4" onClick={() => setStep(2)}>
              Back
            </button>
            <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={loading || !selected.length}>
              {loading ? 'Generating…' : 'Generate & share'}
            </button>
          </div>
        </form>
      )}

      {step === 4 && invite && (
        <div className="yulo-licence-form">
          <p className="mb-2">Invite ready for <strong>{invite.staff_email}</strong>.</p>
          <div className="mb-3">
            <label className="form-label small text-uppercase fw-medium">Temporary password</label>
            <input className="form-control font-monospace" readOnly value={invite.temp_password || ''} />
          </div>
          <div className="mb-4">
            <label className="form-label small text-uppercase fw-medium">Member setup URL</label>
            <input className="form-control" readOnly value={invite.invite_url || ''} />
            <p className="small text-muted mt-2 mb-0">
              Click <strong>Processed Licence</strong> to email the member. They verify OTP, enter the temp password,
              and create their own password. The licence then appears under Licences.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-dark rounded-pill px-4"
              disabled={loading || emailSent}
              onClick={onProcessedLicence}
            >
              {loading ? 'Sending…' : emailSent ? 'Email sent' : 'Processed Licence'}
            </button>
            {emailSent && (
              <button type="button" className="btn btn-outline-dark rounded-pill px-4" onClick={resetWizard}>
                Provide another licence
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LicencesPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editFeatures, setEditFeatures] = useState([]);
  const [savingFeatures, setSavingFeatures] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await staffLicenceService.list();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId],
  );

  const deleteTarget = useMemo(
    () => items.find((item) => item.id === deleteId) || null,
    [items, deleteId],
  );

  const runAction = async (id, action, successMsg) => {
    setBusyId(id);
    try {
      await action();
      toast.success(successMsg);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const onBan = (id) => runAction(id, () => staffLicenceService.ban(id), 'Licence banned');
  const onUnban = (id) => runAction(id, () => staffLicenceService.unban(id), 'Licence restored');
  const onApprove = (id) => runAction(id, () => staffLicenceService.approve(id), 'Approved — welcome email sent');
  const onReject = (id) => runAction(id, () => staffLicenceService.reject(id), 'Licence rejected');

  const openSettings = () => {
    if (!selected) return;
    setEditFeatures([...(selected.features || [])]);
    setSettingsOpen(true);
  };

  const toggleEditFeature = (key) => {
    setEditFeatures((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const saveFeatures = async () => {
    if (!selected) return;
    if (!editFeatures.length) {
      toast.error('Select at least one feature');
      return;
    }
    setSavingFeatures(true);
    try {
      const data = await staffLicenceService.updateFeatures(selected.id, editFeatures);
      if (data?.email_sent) {
        toast.success('Features updated — member notified by email');
      } else if (Array.isArray(data?.added) || Array.isArray(data?.removed)) {
        toast.success('Features updated (email could not be sent)');
      } else {
        toast.info('No feature changes to save');
      }
      setSettingsOpen(false);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update features');
    } finally {
      setSavingFeatures(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setBusyId(id);
    try {
      await staffLicenceService.remove(id);
      toast.success('Licence deleted');
      setDeleteId(null);
      if (selectedId === id) setSelectedId(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="yulo-card p-4 text-muted">Loading licences…</div>;
  }

  if (!items.length) {
    return <div className="yulo-card p-4 text-muted">No licences provided yet.</div>;
  }

  const deleteModal = (
    <ConfirmModal
      show={!!deleteId}
      title="Delete licence permanently"
      message={
        deleteTarget
          ? `Delete licence data for ${deleteTarget.staff_name || deleteTarget.staff_email} permanently? This cannot be undone.`
          : 'Delete this licence data permanently? This cannot be undone.'
      }
      confirmLabel={busyId === deleteId ? 'Deleting…' : 'Delete permanently'}
      cancelLabel="Cancel"
      variant="outline-dark"
      pill
      confirmIcon="bi-trash"
      confirmDisabled={busyId === deleteId}
      onConfirm={confirmDelete}
      onCancel={() => setDeleteId(null)}
    />
  );

  const settingsModal = (
    <ConfirmModal
      show={settingsOpen && !!selected}
      title="Configure licence features"
      message={
        selected
          ? `Add or remove features for ${selected.staff_name || selected.staff_email}.`
          : null
      }
      confirmLabel={savingFeatures ? 'Saving…' : 'Save features'}
      cancelLabel="Cancel"
      variant="dark"
      pill
      confirmIcon="bi-check-lg"
      confirmDisabled={savingFeatures || !editFeatures.length}
      onConfirm={saveFeatures}
      onCancel={() => setSettingsOpen(false)}
    >
      <div className="yulo-licence-features mt-3">
        {FEATURE_OPTIONS.map((f) => (
          <label key={f.key} className={`yulo-licence-feature ${editFeatures.includes(f.key) ? 'is-on' : ''}`}>
            <input
              type="checkbox"
              checked={editFeatures.includes(f.key)}
              onChange={() => toggleEditFeature(f.key)}
            />
            <span>{f.label}</span>
          </label>
        ))}
      </div>
    </ConfirmModal>
  );

  if (selected) {
    const busy = busyId === selected.id;
    return (
      <>
        <div className="yulo-card p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={() => setSelectedId(null)}>
              ← Back to licences
            </button>
            <span className="small text-muted">{selected.staff_name || selected.staff_email}</span>
          </div>

          <div className="table-responsive">
            <table className="table yulo-licence-table align-middle mb-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Access to licences</th>
                  <th>Generated date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{selected.staff_name || '—'}</td>
                  <td>{selected.staff_email}</td>
                  <td className="yulo-licence-table__features">{formatFeatures(selected.features)}</td>
                  <td>{formatDate(selected.created_at)}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`yulo-licence-status yulo-licence-status--${selected.status}`}>
                        {STATUS_LABELS[selected.status] || selected.status}
                      </span>
                      {selected.status === 'approved' && (
                        <button
                          type="button"
                          className="btn btn-outline-dark btn-sm rounded-circle yulo-licence-settings-btn"
                          title="Configure features"
                          aria-label="Configure features"
                          disabled={busy || savingFeatures}
                          onClick={openSettings}
                        >
                          <i className="bi bi-gear" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-2">
                      {selected.status === 'pending_approval' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-dark btn-sm rounded-pill px-3"
                            disabled={busy}
                            onClick={() => onApprove(selected.id)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-dark btn-sm rounded-pill px-3"
                            disabled={busy}
                            onClick={() => onReject(selected.id)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {selected.status !== 'banned' && selected.status !== 'rejected' && (
                        <button
                          type="button"
                          className="btn btn-outline-dark btn-sm rounded-pill px-3"
                          disabled={busy}
                          onClick={() => onBan(selected.id)}
                        >
                          Ban
                        </button>
                      )}
                      {selected.status === 'banned' && (
                        <button
                          type="button"
                          className="btn btn-dark btn-sm rounded-pill px-3"
                          disabled={busy}
                          onClick={() => onUnban(selected.id)}
                        >
                          Unban
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-dark btn-sm rounded-pill px-3"
                        disabled={busy}
                        onClick={() => setDeleteId(selected.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {deleteModal}
        {settingsModal}
      </>
    );
  }

  return (
    <>
      <div className="yulo-licence-cards">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="yulo-licence-user-card"
            onClick={() => setSelectedId(item.id)}
          >
            <span className="yulo-licence-user-card__avatar" aria-hidden="true">
              {(item.staff_name || item.staff_email || '?').charAt(0).toUpperCase()}
            </span>
            <span className="yulo-licence-user-card__body">
              <strong>{item.staff_name || item.staff_email}</strong>
              <em>{STATUS_LABELS[item.status] || item.status}</em>
            </span>
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        ))}
      </div>
      {deleteModal}
      {settingsModal}
    </>
  );
}

export default function AdminConfig() {
  const { user } = useAuth();
  const [tab, setTab] = useState('provide');

  if (!isMasterAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Admin Config — YULO Admin</title>
      </Helmet>
      <PageHeader
        title="Admin Config"
        subtitle="Provide staff licences and manage licensed members."
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

      {tab === 'provide' ? <ProvideLicencePanel /> : <LicencesPanel />}
    </>
  );
}
