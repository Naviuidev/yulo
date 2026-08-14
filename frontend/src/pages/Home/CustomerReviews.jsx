import { useEffect, useMemo, useState } from 'react';
import RatingStars from '../../components/ui/RatingStars';
import reviewService from '../../services/reviewService';
import { resolveMediaUrl } from '../../utils/helpers';

function ReviewCard({ review }) {
  return (
    <div className="review-card">
      {review.avatar_path ? (
        <img
          src={resolveMediaUrl(review.avatar_path)}
          alt=""
          className="review-card__avatar"
        />
      ) : null}
      <div className="review-card__quote">&ldquo;</div>
      <RatingStars rating={Number(review.rating) || 0} />
      <p className="review-card__text mt-3">{review.comment}</p>
      <div className="review-card__author">{review.user_name}</div>
    </div>
  );
}

export default function CustomerReviews() {
  const [reviews, setReviews] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    reviewService
      .getTestimonials()
      .then((res) => {
        if (cancelled) return;
        const rows = res.data?.data;
        setReviews(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollMode = reviews.length > 3;

  const track = useMemo(() => {
    if (!scrollMode) return reviews;
    const base = reviews.length < 6 ? [...reviews, ...reviews] : reviews;
    return [...base, ...base];
  }, [reviews, scrollMode]);

  const durationSec = useMemo(() => {
    const n = Math.max(reviews.length, 1);
    return Math.min(100, Math.max(36, n * 10));
  }, [reviews.length]);

  if (!ready || !reviews.length) return null;

  return (
    <section className="section-padding customer-reviews" data-aos="fade-up">
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="section-title">What Our Customers Say</h2>
          <div className="gold-line" />
        </div>

        {scrollMode ? (
          <div
            className="reviews-marquee"
            style={{ '--reviews-duration': `${durationSec}s` }}
          >
            <div className="reviews-marquee__track">
              {track.map((review, i) => (
                <div key={`${review.id}-${i}`} className="reviews-marquee__item">
                  <ReviewCard review={review} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="row g-4 justify-content-center">
            {reviews.map((review) => (
              <div key={review.id} className="col-md-4">
                <ReviewCard review={review} />
              </div>
            ))}
          </div>
        )}

        <p className="customer-reviews__handle text-center mb-0 mt-5">@YULOFASHION</p>
      </div>
    </section>
  );
}
