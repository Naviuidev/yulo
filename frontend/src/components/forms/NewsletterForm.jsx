import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { newsletterService } from '../../services/contentService';
import Button from '../ui/Button';

export default function NewsletterForm({ compact = false }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      await newsletterService.subscribe(data.email);
      toast.success('Subscribed successfully!');
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Subscription failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`d-flex ${compact ? 'gap-2' : 'flex-column gap-3'}`}>
      <input
        type="email"
        placeholder="Your email address"
        className="form-control"
        style={compact ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' } : {}}
        {...register('email', { required: true })}
      />
      <Button type="submit" variant={compact ? 'gold' : 'primary'} loading={isSubmitting}>
        Subscribe
      </Button>
    </form>
  );
}
