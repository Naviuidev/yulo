import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/ui/Button';
import useAuth from '../../hooks/useAuth';
import reviewService from '../../services/reviewService';
import { getProductImage } from '../../utils/helpers';

export default function WriteReview() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState('');
  const [productId, setProductId] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setFullName((prev) => prev || user?.name || '');
    let cancelled = false;
    (async () => {
      try {
        const res = await reviewService.getPurchasedProducts();
        const rows = res.data?.data ?? [];
        if (!cancelled) setProducts(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) toast.error('Could not load purchased products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.name]);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const onAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setAvatar(null);
      setAvatarPreview('');
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !productId || !comment.trim()) {
      toast.error('Please fill name, product, rating, and comment');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('full_name', fullName.trim());
      fd.append('product_id', String(productId));
      fd.append('rating', String(rating));
      fd.append('comment', comment.trim());
      if (avatar) fd.append('avatar', avatar);
      await reviewService.submit(fd);
      toast.success('Review submitted for approval');
      setComment('');
      setRating(5);
      setAvatar(null);
      setAvatarPreview('');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <SEO title="Write a Review" />
        <div className="page-header">
          <div className="container">
            <Breadcrumb items={[{ label: 'Write a Review' }]} />
            <h1>Write a Review</h1>
          </div>
        </div>
        <div className="container py-5 text-center">
          <p className="text-muted mb-4">Please log in to review products you have purchased.</p>
          <Link
            to="/login"
            state={{ from: { pathname: '/write-review' } }}
            className="btn btn-dark"
          >
            Log in to continue
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="Write a Review" />
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ label: 'Write a Review' }]} />
          <h1>Write a Review</h1>
        </div>
      </div>

      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-7">
            {loading ? (
              <p className="text-muted">Loading your purchased products…</p>
            ) : products.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted mb-3">No purchased products found to review yet.</p>
                <Link to="/shop" className="btn btn-outline-dark">Browse shop</Link>
              </div>
            ) : (
              <form className="yulo-write-review" onSubmit={onSubmit}>
                <div className="mb-4">
                  <label className="form-label small text-uppercase fw-medium">Full name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    maxLength={120}
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label small text-uppercase fw-medium">Rating</label>
                  <div className="yulo-write-review__stars">
                    {Array.from({ length: 5 }, (_, i) => {
                      const value = i + 1;
                      const active = value <= (hoverRating || rating);
                      return (
                        <button
                          key={value}
                          type="button"
                          className={`yulo-write-review__star ${active ? 'is-active' : ''}`}
                          onMouseEnter={() => setHoverRating(value)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(value)}
                          aria-label={`${value} star${value > 1 ? 's' : ''}`}
                        >
                          <i className={`bi ${active ? 'bi-star-fill' : 'bi-star'}`} />
                        </button>
                      );
                    })}
                    <span className="small text-muted ms-2">{rating}.0</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label small text-uppercase fw-medium">Product</label>
                  <select
                    className="form-select"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    required
                  >
                    <option value="">Select a purchased product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {productId ? (
                    <div className="yulo-write-review__product-preview mt-3">
                      <img
                        src={getProductImage(products.find((p) => String(p.id) === String(productId)) || {})}
                        alt=""
                      />
                      <span>{products.find((p) => String(p.id) === String(productId))?.name}</span>
                    </div>
                  ) : null}
                </div>

                <div className="mb-4">
                  <label className="form-label small text-uppercase fw-medium">Comment</label>
                  <textarea
                    className="form-control"
                    rows={5}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    maxLength={2000}
                    placeholder="Share your experience with this product…"
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label small text-uppercase fw-medium">
                    Profile picture <span className="text-muted fw-normal">(optional)</span>
                  </label>
                  <input type="file" className="form-control" accept="image/*" onChange={onAvatarChange} />
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="yulo-write-review__avatar-preview mt-3" />
                  ) : null}
                </div>

                <Button type="submit" variant="primary" loading={submitting}>
                  Submit review
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
