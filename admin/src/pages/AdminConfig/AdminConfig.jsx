import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import staffLicenceService from '../../services/staffLicenceService';
import { isMasterAdmin } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';

const TABS = [
  { id: 'provide', label: 'Provide Licence', icon: 'bi-person-plus' },
  { id: 'pending', label: 'Pending Licence Action', icon: 'bi-hourglass-split' },
];

const STEPS = [
  { id: 1, label: 'Staff email' },
  { id: 2, label: 'Verify OTP' },
  { id: 3, label: 'Select features' },
  { id: 4, label: 'Share access' },
];

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
      setStep(4);
      toast.success(data.email_sent ? 'Invite emailed to staff' : 'Temp password ready — share manually');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not generate invite');
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
              Share this URL with the member. They will verify OTP on their email, enter the temp password, and create their own password. Then it appears under Pending Licence Action.
            </p>
          </div>
          <button type="button" className="btn btn-dark rounded-pill px-4" onClick={resetWizard}>
            Provide another licence
          </button>
        </div>
      )}
    </div>
  );
}

function PendingLicencePanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await staffLicenceService.pending();
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

  const onApprove = async (id) => {
    setBusyId(id);
    try {
      await staffLicenceService.approve(id);
      toast.success('Approved — welcome email sent');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approve failed');
    } finally {
      setBusyId(null);
    }
  };

  const onReject = async (id) => {
    setBusyId(id);
    try {
      await staffLicenceService.reject(id);
      toast.info('Licence rejected');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reject failed');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="yulo-card p-4 text-muted">Loading pending licences…</div>;
  }

  if (!items.length) {
    return <div className="yulo-card p-4 text-muted">No pending licence actions.</div>;
  }

  return (
    <div className="d-flex flex-column gap-3">
      {items.map((item) => (
        <div key={item.id} className="yulo-card p-4">
          <div className="d-flex flex-wrap justify-content-between gap-3 align-items-start">
            <div>
              <h2 className="h6 mb-1">{item.staff_name || item.staff_email}</h2>
              <p className="small text-muted mb-2">{item.staff_email}</p>
              <p className="small mb-0">
                Features:{' '}
                {(item.features || []).join(', ') || '—'}
              </p>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-dark rounded-pill px-4"
                disabled={busyId === item.id}
                onClick={() => onApprove(item.id)}
              >
                Approve
              </button>
              <button
                type="button"
                className="btn btn-outline-dark rounded-pill px-4"
                disabled={busyId === item.id}
                onClick={() => onReject(item.id)}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
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
        subtitle="Provide staff licences and approve pending access requests."
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

      {tab === 'provide' ? <ProvideLicencePanel /> : <PendingLicencePanel />}
    </>
  );
}
