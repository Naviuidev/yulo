import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/ui/Button';
import { authService } from '../../services/authService';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const defaultToken = searchParams.get('token') ?? '';
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: { token: defaultToken } });

  const onSubmit = async (data) => {
    try {
      await authService.verifyEmail(data.token);
      toast.success('Email verified successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Verification failed');
    }
  };

  return (
    <>
      <SEO title="Verify Email" />
      <div className="container py-5" style={{ maxWidth: 480 }}>
        <Breadcrumb items={[{ label: 'Verify Email' }]} />
        <h1 className="h3 fw-semibold mb-4">Verify Email</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="yulo-form">
          <div className="mb-4">
            <label className="form-label">Verification Token</label>
            <input className="form-control" {...register('token', { required: true })} />
          </div>
          <Button type="submit" loading={isSubmitting} className="w-100">Verify Email</Button>
        </form>
      </div>
    </>
  );
}
