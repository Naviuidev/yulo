import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import useAuth from '../../hooks/useAuth';
import Button from '../ui/Button';
import MarketingOptInPopup from '../auth/MarketingOptInPopup';
import { authService } from '../../services/authService';
import { profileService } from '../../services/contentService';

export default function RegisterForm() {
  const { register: registerUser, completeOtpLogin, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('register'); // register | otp
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [showOptIn, setShowOptIn] = useState(false);
  const [savingOptIn, setSavingOptIn] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const {
    register: registerOtp,
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors, isSubmitting: otpSubmitting },
    reset: resetOtp,
  } = useForm();

  const finishWithOptIn = () => {
    setShowOptIn(true);
  };

  const onOptInConfirm = async (optIn) => {
    setSavingOptIn(true);
    try {
      await profileService.updateProfile({ marketing_opt_in: optIn });
      await refreshUser?.();
      toast.success(
        optIn
          ? 'You are opted in to promotions'
          : 'You opted out of promotional emails'
      );
    } catch {
      // Preference defaults to opted-in on the server if save fails
      toast.info('Welcome to YULO');
    } finally {
      setSavingOptIn(false);
      setShowOptIn(false);
      navigate('/');
    }
  };

  const onRegister = async (data) => {
    try {
      const payload = await registerUser(data);
      if (payload?.requires_otp) {
        setEmail(payload.email || data.email);
        setStep('otp');
        resetOtp({ otp: '' });
        toast.success('OTP sent to your email');
        return;
      }
      if (payload?.tokens) {
        finishWithOptIn();
        return;
      }
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Registration failed';
      const dataPayload = err.response?.data?.data;
      if (dataPayload?.requires_otp) {
        setEmail(dataPayload.email || data.email);
        setStep('otp');
        toast.info(msg);
        return;
      }
      toast.error(msg);
    }
  };

  const onVerifyOtp = async (data) => {
    try {
      await completeOtpLogin({ email, otp: data.otp });
      toast.success('Account verified — welcome to YULO');
      finishWithOptIn();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Invalid OTP');
    }
  };

  const onResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await authService.resendOtp(email);
      toast.success('A new OTP has been sent');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <MarketingOptInPopup open={showOptIn} saving={savingOptIn} onConfirm={onOptInConfirm} />

      {step === 'otp' ? (
        <form onSubmit={handleOtpSubmit(onVerifyOtp)} className="yulo-form">
          <p className="mb-3 small text-muted">
            Enter the 6-digit code sent to <strong className="text-dark">{email}</strong>
          </p>
          <div className="mb-4">
            <label className="form-label">OTP Code</label>
            <input
              className={`form-control text-center ${otpErrors.otp ? 'is-invalid' : ''}`}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              style={{ letterSpacing: '0.35em', fontSize: '1.25rem' }}
              {...registerOtp('otp', {
                required: 'OTP is required',
                pattern: { value: /^\d{6}$/, message: 'Enter the 6-digit code' },
              })}
            />
            {otpErrors.otp && <div className="invalid-feedback">{otpErrors.otp.message}</div>}
          </div>
          <Button type="submit" loading={otpSubmitting} className="w-100">
            Verify &amp; Create Account
          </Button>
          <div className="d-flex justify-content-between align-items-center mt-4">
            <button type="button" className="btn btn-link btn-sm p-0 text-dark" onClick={() => setStep('register')}>
              ← Edit details
            </button>
            <button type="button" className="btn btn-link btn-sm p-0 text-dark" onClick={onResend} disabled={resending}>
              {resending ? 'Sending…' : 'Resend OTP'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit(onRegister)} className="yulo-form">
          <div className="mb-3">
            <label className="form-label">Full Name</label>
            <input className={`form-control ${errors.name ? 'is-invalid' : ''}`} {...register('name', { required: 'Name is required' })} />
            {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
          </div>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`} {...register('email', { required: 'Email is required' })} />
            {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
          </div>
          <div className="mb-3">
            <label className="form-label">Phone (optional)</label>
            <input type="tel" className="form-control" {...register('phone')} />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input type="password" className={`form-control ${errors.password ? 'is-invalid' : ''}`} {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })} />
            {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
          </div>
          <div className="mb-4">
            <label className="form-label">Confirm Password</label>
            <input type="password" className={`form-control ${errors.password_confirmation ? 'is-invalid' : ''}`} {...register('password_confirmation', { required: 'Please confirm password', validate: (v) => v === watch('password') || 'Passwords do not match' })} />
            {errors.password_confirmation && <div className="invalid-feedback">{errors.password_confirmation.message}</div>}
          </div>
          <Button type="submit" loading={isSubmitting} className="w-100">Continue</Button>
          <p className="text-center mt-3 small text-muted mb-0">
            We’ll email a one-time password to verify your account.
          </p>
          <p className="text-center mt-3 small text-muted">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      )}
    </>
  );
}
