import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { reviewService } from '../../services/contentService';
import Button from '../ui/Button';
import RatingStars from '../ui/RatingStars';
import { useState } from 'react';

export default function ReviewForm({ productId, onSuccess }) {
  const [rating, setRating] = useState(5);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      await reviewService.submit({ ...data, product_id: productId, rating });
      toast.success('Review submitted!');
      reset();
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not submit review');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="yulo-form">
      <div className="mb-3">
        <label className="form-label">Rating</label>
        <div className="d-flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" className="btn btn-link p-0 text-warning" onClick={() => setRating(s)}>
              <i className={`bi ${s <= rating ? 'bi-star-fill' : 'bi-star'}`} />
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label">Title</label>
        <input className="form-control" {...register('title', { required: true })} />
      </div>
      <div className="mb-3">
        <label className="form-label">Review</label>
        <textarea className="form-control" rows={4} {...register('comment', { required: true })} />
      </div>
      <Button type="submit" loading={isSubmitting}>Submit Review</Button>
    </form>
  );
}
