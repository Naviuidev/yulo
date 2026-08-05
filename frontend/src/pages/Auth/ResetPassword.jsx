import { useForm } from 'react-hook-form';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/ui/Button';
import { authService } from '../../services/authService';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      await authService.resetPassword({ ...data, token });
      toast.success('Password reset successfully');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Reset failed');
    }
  };

  return (
    <>
      <SEO title="Reset Password" />
      <div className="container py-5" style={{ maxWidth: 480 }}>
        <Breadcrumb items={[{ label: 'Reset Password' }]} />
        <h1 className="h3 fw-semibold mb-4">Reset Password</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="yulo-form">
          <div className="mb-3">
            <label className="form-label">New Password</label>
            <input type="password" className="form-control" {...register('password', { required: true, minLength: 8 })} />
          </div>
          <div className="mb-4">
            <label className="form-label">Confirm Password</label>
            <input type="password" className="form-control" {...register('password_confirmation', { required: true, validate: (v) => v === watch('password') || 'Passwords do not match' })} />
          </div>
          <Button type="submit" loading={isSubmitting} className="w-100">Reset Password</Button>
        </form>
      </div>
    </>
  );
}
