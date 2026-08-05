import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import useAuth from '../../hooks/useAuth';
import Button from '../ui/Button';

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Login failed');
    }
  };

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
