import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import { staffOnboardService } from '../../services/staffLicenceService';
import YuloLogo from '../../components/common/YuloLogo';

const STEPS = [
  { id: 1, label: 'Verify email OTP' },
  { id: 2, label: 'Set password' },
];

export default function StaffOnboard() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(null);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [name, setName] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await staffOnboardService.show(token);
        if (cancelled) return;
        setInfo(data);
        setEmail(data.staff_email || '');
        setName(data.staff_name || '');
        if (data.status === 'pending_approval') {
          setDone(true);
        } else if (data.otp_verified) {
          setStep(2);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Invite not found or expired.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const sendOtp = async () => {
    setBusy(true);
    try {
      await staffOnboardService.sendOtp(token, email);
      setOtpSent(true);
      toast.success('OTP sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send OTP');
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await staffOnboardService.verifyOtp(token, email, otp);
      toast.success('OTP verified');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setBusy(false);
    }
  };

  const complete = async (e) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      toast.error('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await staffOnboardService.complete(token, {
        email,
        name,
        temp_password: tempPassword,
        password,
        password_confirmation: passwordConfirmation,
      });
      setDone(true);
      toast.success('Submitted for master admin approval');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not complete setup');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Staff setup — YULO Admin</title>
      </Helmet>
      <div className="yulo-login">
        <div className="yulo-login__card" style={{ maxWidth: 480 }}>
          <div className="yulo-login__header">
            <YuloLogo variant="light" className="yulo-login__logo" />
            <h1 className="yulo-login__title">Staff access setup</h1>
            <p className="yulo-login__subtitle">Complete your invite to join YULO Admin</p>
          </div>

          {loading ? (
            <p className="yulo-onboard-msg text-center">Loading invite…</p>
          ) : error ? (
            <div className="text-center">
              <p className="yulo-onboard-msg yulo-onboard-msg--error mb-3">{error}</p>
              <Link to="/login" className="yulo-login__btn d-inline-flex justify-content-center text-decoration-none">
                Go to login
              </Link>
            </div>
          ) : done ? (
            <div className="text-center">
              <p className="yulo-onboard-msg mb-3">
                Your setup is complete and waiting for <strong>master admin approval</strong>.
                You will receive a welcome email when approved.
              </p>
              <Link to="/login" className="yulo-login__btn d-inline-flex justify-content-center text-decoration-none">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <nav className="yulo-licence-steps yulo-licence-steps--on-dark mb-4" aria-label="Setup steps">
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
                <form className="yulo-login__form" onSubmit={verifyOtp}>
                  <div className="yulo-login__field">
                    <label htmlFor="so-email">Your email</label>
                    <input
                      id="so-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      readOnly={!!info?.staff_email}
                    />
                  </div>
                  <div className="d-flex gap-2 mb-1">
                    <button
                      type="button"
                      className="yulo-login__btn yulo-login__btn--ghost flex-grow-1"
                      onClick={sendOtp}
                      disabled={busy}
                    >
                      {otpSent ? 'Resend OTP' : 'Send OTP'}
                    </button>
                  </div>
                  <div className="yulo-login__field">
                    <label htmlFor="so-otp">OTP</label>
                    <input
                      id="so-otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                    />
                  </div>
                  <button type="submit" className="yulo-login__btn" disabled={busy || otp.length !== 6}>
                    Verify OTP
                  </button>
                </form>
              )}

              {step === 2 && (
                <form className="yulo-login__form" onSubmit={complete}>
                  <div className="yulo-login__field">
                    <label htmlFor="so-name">Display name</label>
                    <input id="so-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="yulo-login__field">
                    <label htmlFor="so-temp">Temporary password</label>
                    <input
                      id="so-temp"
                      type="text"
                      required
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      placeholder="From your invite email"
                    />
                  </div>
                  <div className="yulo-login__field">
                    <label htmlFor="so-pass">New password</label>
                    <input
                      id="so-pass"
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="yulo-login__field">
                    <label htmlFor="so-pass2">Confirm password</label>
                    <input
                      id="so-pass2"
                      type="password"
                      required
                      minLength={8}
                      value={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="yulo-login__btn" disabled={busy}>
                    Submit for approval
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
