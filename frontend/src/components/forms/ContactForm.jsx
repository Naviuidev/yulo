import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { contactService } from '../../services/contentService';
import Button from '../ui/Button';

export default function ContactForm() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      await contactService.submit(data);
      toast.success('Message sent! We\'ll get back to you soon.');
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not send message');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="yulo-form">
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label">Name</label>
          <input className={`form-control ${errors.name ? 'is-invalid' : ''}`} {...register('name', { required: true })} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Email</label>
          <input type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`} {...register('email', { required: true })} />
        </div>
        <div className="col-12">
          <label className="form-label">Subject</label>
          <input className={`form-control ${errors.subject ? 'is-invalid' : ''}`} {...register('subject', { required: true })} />
        </div>
        <div className="col-12">
          <label className="form-label">Message</label>
          <textarea className={`form-control ${errors.message ? 'is-invalid' : ''}`} rows={5} {...register('message', { required: true })} />
        </div>
        <div className="col-12">
          <Button type="submit" loading={isSubmitting}>Send Message</Button>
        </div>
      </div>
    </form>
  );
}
