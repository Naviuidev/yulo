import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/ui/Button';
import useAuth from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { useState } from 'react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeOtpLogin } = useAuth();
  const [resending, setResending] = useState(false);
  const defaultEmail = searchParams.get('email') ?? '';

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { email: defaultEmail, otp: '' },
  });

  const email = watch('email');

  const onSubmit = async (data) => {
    try {
      await completeOtpLogin({ email: data.email, otp: data.otp });
      toast.success('Email verified successfully!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Verification failed');
    }
  };

  const onResend = async () => {
    if (!email) {
      toast.error('Enter your email first');
      return;
    }
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
      <SEO title="Verify Email" />
      <div className="container py-5" style={{ maxWidth: 480 }}>
        <Breadcrumb items={[{ label: 'Verify Email' }]} />
        <h1 className="h3 fw-semibold mb-2 text-uppercase">Verify Email</h1>
        <p className="text-muted small mb-4">Enter the 6-digit OTP sent to your Gmail inbox.</p>
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
          <div className="mb-4">
            <label className="form-label">OTP Code</label>
            <input
              className={`form-control text-center ${errors.otp ? 'is-invalid' : ''}`}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              style={{ letterSpacing: '0.35em', fontSize: '1.25rem' }}
              {...register('otp', {
                required: 'OTP is required',
                pattern: { value: /^\d{6}$/, message: 'Enter the 6-digit code' },
              })}
            />
            {errors.otp && <div className="invalid-feedback">{errors.otp.message}</div>}
          </div>
          <Button type="submit" loading={isSubmitting} className="w-100">Verify Email</Button>
          <div className="d-flex justify-content-between align-items-center mt-4">
            <Link to="/login" className="small text-dark">Back to login</Link>
            <button type="button" className="btn btn-link btn-sm p-0 text-dark" onClick={onResend} disabled={resending}>
              {resending ? 'Sending…' : 'Resend OTP'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
