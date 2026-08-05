export default function RatingStars({ rating = 0, max = 5, showValue = false }) {
  const stars = Array.from({ length: max }, (_, i) => {
    const filled = i < Math.floor(rating);
    const half = !filled && i < rating;
    return filled ? 'bi-star-fill' : half ? 'bi-star-half' : 'bi-star';
  });

  return (
    <div className="rating-stars">
      {stars.map((icon, i) => (
        <i key={i} className={`bi ${icon}`} />
      ))}
      {showValue && <span className="ms-1 text-muted small">{rating.toFixed(1)}</span>}
    </div>
  );
}
