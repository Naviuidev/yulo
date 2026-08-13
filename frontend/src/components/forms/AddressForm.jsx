import { useForm } from 'react-hook-form';
import Button from '../ui/Button';

export default function AddressForm({ onSubmit, defaultValues = {}, loading = false }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="yulo-form">
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label">Full Name</label>
          <input
            className={`form-control ${errors.name ? 'is-invalid' : ''}`}
            {...register('name', { required: true })}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Phone (10-digit mobile)</label>
          <input
            className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
            placeholder="9876543210"
            {...register('phone', {
              required: true,
              pattern: { value: /^[6-9]\d{9}$/, message: 'Enter valid 10-digit mobile' },
            })}
          />
          {errors.phone && <div className="invalid-feedback d-block">{errors.phone.message || 'Phone is required'}</div>}
        </div>
        <div className="col-12">
          <label className="form-label">Address Line 1</label>
          <input className={`form-control ${errors.address_line1 ? 'is-invalid' : ''}`} {...register('address_line1', { required: true })} />
        </div>
        <div className="col-12">
          <label className="form-label">Address Line 2</label>
          <input className="form-control" {...register('address_line2')} />
        </div>
        <div className="col-md-4">
          <label className="form-label">City</label>
          <input className={`form-control ${errors.city ? 'is-invalid' : ''}`} {...register('city', { required: true })} />
        </div>
        <div className="col-md-4">
          <label className="form-label">State</label>
          <input className={`form-control ${errors.state ? 'is-invalid' : ''}`} {...register('state', { required: true })} />
        </div>
        <div className="col-md-4">
          <label className="form-label">PIN Code</label>
          <input className={`form-control ${errors.pincode ? 'is-invalid' : ''}`} {...register('pincode', { required: true })} />
        </div>
        <div className="col-12">
          <div className="form-check">
            <input type="checkbox" className="form-check-input" id="is_default" {...register('is_default')} />
            <label className="form-check-label" htmlFor="is_default">Set as default address</label>
          </div>
        </div>
        <div className="col-12">
          <Button type="submit" loading={loading}>Save Address</Button>
        </div>
      </div>
    </form>
  );
}
