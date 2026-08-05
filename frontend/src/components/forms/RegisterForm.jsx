import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import useAuth from '../../hooks/useAuth';
import Button from '../ui/Button';

export default function RegisterForm() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      await registerUser(data);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Registration failed';
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="yulo-form">
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
      <Button type="submit" loading={isSubmitting} className="w-100">Create Account</Button>
      <p className="text-center mt-4 small text-muted">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </form>
  );
}
