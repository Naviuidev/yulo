import { MOCK_REVIEWS } from '../../utils/constants';
import RatingStars from '../../components/ui/RatingStars';

export default function CustomerReviews() {
  return (
    <section className="section-padding" data-aos="fade-up">
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="section-title">What Our Customers Say</h2>
          <div className="gold-line" />
        </div>
        <div className="row g-4">
          {MOCK_REVIEWS.map((review) => (
            <div key={review.id} className="col-md-4">
              <div className="review-card">
                <div className="review-card__quote">&ldquo;</div>
                <RatingStars rating={review.rating} />
                <p className="review-card__text mt-3">{review.comment}</p>
                <div className="review-card__author">{review.user_name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
