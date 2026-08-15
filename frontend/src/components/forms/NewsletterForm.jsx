import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { newsletterService } from '../../services/contentService';
import Button from '../ui/Button';

const THANKS_MSG =
  'Thanks for the subscription. You will receive the latest news and campaigns via email.';

export default function NewsletterForm({ compact = false }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      const res = await newsletterService.subscribe(data.email);
      const msg = res?.data?.message || THANKS_MSG;
      toast.success(msg);
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Subscription failed');
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`newsletter-form d-flex ${compact ? 'gap-2 newsletter-form--compact' : 'flex-column gap-3'}`}
    >
      <input
        type="email"
        placeholder="Your email address"
        className="form-control"
        style={compact ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' } : {}}
        {...register('email', { required: true })}
      />
      <Button type="submit" variant={compact ? 'gold' : 'primary'} loading={isSubmitting} className="newsletter-form__btn">
        Subscribe
      </Button>
    </form>
  );
}
