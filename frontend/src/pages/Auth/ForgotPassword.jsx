import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/ui/Button';
import { authService } from '../../services/authService';

export default function ForgotPassword() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      await authService.forgotPassword(data.email);
      toast.success('Reset link sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not send reset link');
    }
  };

  return (
    <>
      <SEO title="Forgot Password" />
      <div className="container py-5" style={{ maxWidth: 480 }}>
        <Breadcrumb items={[{ label: 'Forgot Password' }]} />
        <h1 className="h3 fw-semibold mb-2">Forgot Password</h1>
        <p className="text-muted mb-4">Enter your email and we&apos;ll send you a reset link.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="yulo-form">
          <div className="mb-4">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" {...register('email', { required: true })} />
          </div>
          <Button type="submit" loading={isSubmitting} className="w-100">Send Reset Link</Button>
        </form>
      </div>
    </>
  );
}
