import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import useAuth from '../../hooks/useAuth';
import Button from '../ui/Button';
import { authService } from '../../services/authService';

export default function LoginForm() {
  const { login, completeOtpLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/';

  const [step, setStep] = useState('login');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const {
    register: registerOtp,
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors, isSubmitting: otpSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err) {
      const payload = err.response?.data?.data;
      if (err.response?.status === 403 && payload?.requires_otp) {
        setEmail(payload.email || data.email);
        setStep('otp');
        toast.info('OTP sent — verify your email to continue');
        return;
      }
      toast.error(err.response?.data?.message ?? 'Login failed');
    }
  };

  const onVerifyOtp = async (data) => {
    try {
      await completeOtpLogin({ email, otp: data.otp });
      toast.success('Email verified — welcome back');
      navigate(from, { replace: true });
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

  if (step === 'otp') {
    return (
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
        <Button type="submit" loading={otpSubmitting} className="w-100">Verify &amp; Sign In</Button>
        <div className="d-flex justify-content-between align-items-center mt-4">
          <button type="button" className="btn btn-link btn-sm p-0 text-dark" onClick={() => setStep('login')}>
            ← Back to login
          </button>
          <button type="button" className="btn btn-link btn-sm p-0 text-dark" onClick={onResend} disabled={resending}>
            {resending ? 'Sending…' : 'Resend OTP'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="yulo-form">
      <div className="mb-3">
        <label className="form-label">Email</label>
        <input
          type="email"
          className={`form-control ${errors.email ? 'is-invalid' : ''}`}
          {...register('email', { required: 'Email is required' })}
        />
        {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
      </div>
      <div className="mb-3">
        <label className="form-label">Password</label>
        <input
          type="password"
          className={`form-control ${errors.password ? 'is-invalid' : ''}`}
          {...register('password', { required: 'Password is required' })}
        />
        {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
      </div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Link to="/forgot-password" className="small text-muted">Forgot password?</Link>
      </div>
      <Button type="submit" loading={isSubmitting} className="w-100">Sign In</Button>
      <p className="text-center mt-4 small text-muted">
        Don&apos;t have an account? <Link to="/register">Create one</Link>
      </p>
    </form>
  );
}
